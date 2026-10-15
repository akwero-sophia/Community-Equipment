const mongoose = require('mongoose');
const BorrowRequest = require('../models/BorrowRequest');
const Equipment = require('../models/Equipment');

// Validates the borrowing start and end dates.
function validateDates(startDateValue, endDateValue) {
  const startDate = new Date(startDateValue);
  const endDate = new Date(endDateValue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Checks whether the supplied dates are valid.
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { error: 'Start date and end date must be valid dates.' };
  }

  // Ensures the end date is after the start date.
  if (endDate <= startDate) return { error: 'End date must be after start date.' };

  // Prevents borrowing requests from starting in the past.
  if (startDate < today) return { error: 'Start date cannot be in the past.' };

  return { startDate, endDate };
}

// Checks for conflicting pending or approved borrowing requests.
async function hasConflict(equipmentId, startDate, endDate, excludeId = null) {
  const filter = {
    equipment: equipmentId,
    status: { $in: ['Pending', 'Approved'] },
    startDate: { $lt: endDate },
    endDate: { $gt: startDate }
  };

  // Excludes the current request when checking for conflicts during review.
  if (excludeId) filter._id = { $ne: excludeId };

  return BorrowRequest.exists(filter);
}

// Creates and submits a new equipment borrowing request.
async function createBorrowRequest(req, res) {
  try {
    const { equipment: equipmentId, startDate, endDate, purpose } = req.body;

    // Validates that all required borrowing details are provided.
    if (!equipmentId || !startDate || !endDate || !purpose?.trim()) {
      return res.status(400).json({ message: 'Equipment, dates, and purpose are required.' });
    }

    // Checks whether the equipment ID is valid.
    if (!mongoose.isValidObjectId(equipmentId)) return res.status(400).json({ message: 'Invalid equipment ID.' });

    // Retrieves the selected equipment from the database.
    const equipment = await Equipment.findById(equipmentId);

    // Ensures the equipment exists and is available for borrowing.
    if (!equipment) return res.status(404).json({ message: 'Equipment not found.' });
    if (equipment.status !== 'Available') return res.status(409).json({ message: 'This equipment is not currently available.' });

    // Validates the requested borrowing dates.
    const dates = validateDates(startDate, endDate);
    if (dates.error) return res.status(400).json({ message: dates.error });

    // Prevents submission when another active request overlaps the selected dates.
    if (await hasConflict(equipmentId, dates.startDate, dates.endDate)) {
      return res.status(409).json({ message: 'Those dates conflict with an existing pending or approved request.' });
    }

    // Saves the new borrowing request to the database.
    const request = await BorrowRequest.create({
      equipment: equipmentId,
      requester: req.user._id,
      startDate: dates.startDate,
      endDate: dates.endDate,
      purpose: purpose.trim()
    });

    // Retrieves related equipment and requester details for the response.
    const populated = await request.populate([
      { path: 'equipment', select: 'name category status location' },
      { path: 'requester', select: 'name email' }
    ]);

    res.status(201).json({ message: 'Borrow request submitted.', request: populated });
  } catch (error) {
    // Returns an error if the borrowing request cannot be submitted.
    res.status(400).json({ message: 'Unable to submit borrow request.', error: error.message });
  }
}

// Retrieves borrowing requests based on the user's role.
async function getBorrowRequests(req, res) {
  try {
    // Allows administrators to view all requests and users to view their own.
    const filter = req.user.role === 'admin' ? {} : { requester: req.user._id };

    // Fetches requests with related details, sorted from newest to oldest.
    const requests = await BorrowRequest.find(filter)
      .populate('equipment', 'name category status location')
      .populate('requester', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    // Returns an error if borrowing requests cannot be retrieved.
    res.status(500).json({ message: 'Unable to load borrow requests.', error: error.message });
  }
}

// Allows an administrator to approve or reject a borrowing request.
async function reviewBorrowRequest(req, res) {
  try {
    const { decision } = req.body;

    // Validates the administrator's decision.
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be approve or reject.' });
    }

    // Retrieves the borrowing request and its associated equipment.
    const request = await BorrowRequest.findById(req.params.id).populate('equipment');

    // Ensures the request exists and is still pending.
    if (!request) return res.status(404).json({ message: 'Borrow request not found.' });
    if (request.status !== 'Pending') return res.status(409).json({ message: `This request is already ${request.status.toLowerCase()}.` });

    // Rejects the request when the administrator chooses to reject it.
    if (decision === 'reject') {
      request.status = 'Rejected';
    } else {
      // Confirms that the equipment still exists and is available.
      if (!request.equipment || request.equipment.status !== 'Available') {
        return res.status(409).json({ message: 'The equipment is no longer available.' });
      }

      // Checks for conflicting requests before approving the borrowing period.
      if (await hasConflict(request.equipment._id, request.startDate, request.endDate, request._id)) {
        return res.status(409).json({ message: 'Another active request conflicts with these dates.' });
      }

      // Approves the request and marks the equipment as borrowed.
      request.status = 'Approved';
      request.equipment.status = 'Borrowed';
      await request.equipment.save();
    }

    // Records who reviewed the request and when the review occurred.
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    // Retrieves the updated request with its related details.
    const result = await BorrowRequest.findById(request._id)
      .populate('equipment', 'name category status location')
      .populate('requester', 'name email')
      .populate('reviewedBy', 'name email');

    res.json({ message: `Request ${decision}d successfully.`, request: result });
  } catch (error) {
    // Returns an error if the request review fails.
    res.status(500).json({ message: 'Unable to review request.', error: error.message });
  }
}

// Processes the return of borrowed equipment.
async function returnBorrowRequest(req, res) {
  try {
    // Retrieves the borrowing request and its associated equipment.
    const request = await BorrowRequest.findById(req.params.id).populate('equipment');

    // Ensures the borrowing request exists.
    if (!request) return res.status(404).json({ message: 'Borrow request not found.' });

    // Checks whether the requester owns the request or is an administrator.
    const isOwner = request.requester.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You may only return your own approved equipment.' });
    }

    // Allows returns only for approved borrowing requests.
    if (request.status !== 'Approved') return res.status(409).json({ message: 'Only approved requests can be returned.' });

    // Marks the borrowing request as returned.
    request.status = 'Returned';

    // Updates the equipment status to available after its return.
    if (request.equipment) {
      request.equipment.status = 'Available';
      await request.equipment.save();
    }

    // Saves the updated borrowing request.
    await request.save();

    // Retrieves the completed return request with its related details.
    const result = await BorrowRequest.findById(request._id)
      .populate('equipment', 'name category status location')
      .populate('requester', 'name email');

    res.json({ message: 'Equipment returned successfully.', request: result });
  } catch (error) {
    // Returns an error if the equipment return cannot be processed.
    res.status(500).json({ message: 'Unable to process return.', error: error.message });
  }
}

// Exports the borrowing request controller functions for use in routes.
module.exports = { createBorrowRequest, getBorrowRequests, reviewBorrowRequest, returnBorrowRequest };
