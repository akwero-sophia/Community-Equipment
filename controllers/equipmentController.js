const Equipment = require('../models/Equipment');

async function getEquipment(req, res) {
  try {
    const { search = '', category = '', status = '' } = req.query;
    const filter = {};

    if (search.trim()) {
      const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safe, 'i');
      filter.$or = [{ name: regex }, { category: regex }, { description: regex }, { location: regex }];
    }
    if (category && category !== 'All') filter.category = category;
    if (status && status !== 'All') filter.status = status;

    const equipment = await Equipment.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.json({ equipment });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load equipment.', error: error.message });
  }
}

async function getEquipmentById(req, res) {
  try {
    const equipment = await Equipment.findById(req.params.id).populate('createdBy', 'name email');
    if (!equipment) return res.status(404).json({ message: 'Equipment not found.' });
    res.json({ equipment });
  } catch (error) {
    res.status(400).json({ message: 'Invalid equipment ID.' });
  }
}

async function createEquipment(req, res) {
  try {
    const { name, category, description, location, condition, status } = req.body;
    if (!name || !category || !description || !location) {
      return res.status(400).json({ message: 'Name, category, description, and location are required.' });
    }

    const equipment = await Equipment.create({
      name, category, description, location,
      condition: condition || 'Good',
      status: status || 'Available',
      createdBy: req.user._id
    });
    res.status(201).json({ message: 'Equipment created.', equipment });
  } catch (error) {
    res.status(400).json({ message: 'Unable to create equipment.', error: error.message });
  }
}

async function updateEquipment(req, res) {
  try {
    const allowed = ['name', 'category', 'description', 'location', 'condition', 'status'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const equipment = await Equipment.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });
    if (!equipment) return res.status(404).json({ message: 'Equipment not found.' });
    res.json({ message: 'Equipment updated.', equipment });
  } catch (error) {
    res.status(400).json({ message: 'Unable to update equipment.', error: error.message });
  }
}

async function deleteEquipment(req, res) {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ message: 'Equipment not found.' });
    if (equipment.status === 'Borrowed') return res.status(409).json({ message: 'Borrowed equipment cannot be deleted.' });

    await equipment.deleteOne();
    res.json({ message: 'Equipment deleted.' });
  } catch (error) {
    res.status(400).json({ message: 'Unable to delete equipment.' });
  }
}

module.exports = { getEquipment, getEquipmentById, createEquipment, updateEquipment, deleteEquipment };
