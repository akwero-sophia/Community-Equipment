const Equipment = require('../models/Equipment');

// Retrieves equipment records based on search, category, and status filters.
async function getEquipment(req, res) {
  try {
    // Extracts the search and filter values from the query parameters.
    const { search = '', category = '', status = '' } = req.query;
    const filter = {};

    // Searches equipment by name, category, description, or location.
    if (search.trim()) {
      const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safe, 'i');
      filter.$or = [{ name: regex }, { category: regex }, { description: regex }, { location: regex }];
    }

    // Filters equipment by category when a specific category is selected.
    if (category && category !== 'All') filter.category = category;

    // Filters equipment by status when a specific status is selected.
    if (status && status !== 'All') filter.status = status;

    // Retrieves matching equipment with creator details, sorted by newest first.
    const equipment = await Equipment.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.json({ equipment });
  } catch (error) {
    // Returns an error if the equipment records cannot be retrieved.
    res.status(500).json({ message: 'Unable to load equipment.', error: error.message });
  }
}

// Retrieves a single equipment record using its ID.
async function getEquipmentById(req, res) {
  try {
    // Finds the equipment and includes its creator's details.
    const equipment = await Equipment.findById(req.params.id).populate('createdBy', 'name email');

    // Returns an error if the equipment does not exist.
    if (!equipment) return res.status(404).json({ message: 'Equipment not found.' });

    res.json({ equipment });
  } catch (error) {
    // Returns an error if the equipment ID is invalid.
    res.status(400).json({ message: 'Invalid equipment ID.' });
  }
}

// Creates a new equipment record in the database.
async function createEquipment(req, res) {
  try {
    const { name, category, description, location, condition, status } = req.body;

    // Ensures all required equipment details are provided.
    if (!name || !category || !description || !location) {
      return res.status(400).json({ message: 'Name, category, description, and location are required.' });
    }

    // Saves the equipment with default values and the creator's ID.
    const equipment = await Equipment.create({
      name, category, description, location,
      condition: condition || 'Good',
      status: status || 'Available',
      createdBy: req.user._id
    });

    res.status(201).json({ message: 'Equipment created.', equipment });
  } catch (error) {
    // Returns an error if the equipment cannot be created.
    res.status(400).json({ message: 'Unable to create equipment.', error: error.message });
  }
}

// Updates an existing equipment record using its ID.
async function updateEquipment(req, res) {
  try {
    // Defines the equipment fields that are allowed to be updated.
    const allowed = ['name', 'category', 'description', 'location', 'condition', 'status'];
    const updates = {};

    // Collects only the permitted fields provided in the request.
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Updates the equipment and validates the new field values.
    const equipment = await Equipment.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    // Returns an error if the equipment record does not exist.
    if (!equipment) return res.status(404).json({ message: 'Equipment not found.' });

    res.json({ message: 'Equipment updated.', equipment });
  } catch (error) {
    // Returns an error if the equipment cannot be updated.
    res.status(400).json({ message: 'Unable to update equipment.', error: error.message });
  }
}

// Deletes an equipment record from the database.
async function deleteEquipment(req, res) {
  try {
    // Finds the equipment record that needs to be deleted.
    const equipment = await Equipment.findById(req.params.id);

    // Returns an error if the equipment does not exist.
    if (!equipment) return res.status(404).json({ message: 'Equipment not found.' });

    // Prevents deletion of equipment that is currently borrowed.
    if (equipment.status === 'Borrowed') return res.status(409).json({ message: 'Borrowed equipment cannot be deleted.' });

    // Deletes the equipment record from the database.
    await equipment.deleteOne();
    res.json({ message: 'Equipment deleted.' });
  } catch (error) {
    // Returns an error if the equipment cannot be deleted.
    res.status(400).json({ message: 'Unable to delete equipment.' });
  }
}

// Exports the equipment controller functions for use in routes.
module.exports = { getEquipment, getEquipmentById, createEquipment, updateEquipment, deleteEquipment };
