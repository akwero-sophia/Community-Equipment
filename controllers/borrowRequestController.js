const mongoose = require('mongoose');
const BorrowRequest = require('../models/BorrowRequest');
const Equipment = require('../models/Equipment');

function validateDates(startDateValue, endDateValue) {
  const startDate = new Date(startDateValue);
  const endDate = new Date(endDateValue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { error: 'Start date and end date must be valid dates.' };
  }
  if (endDate <= startDate) return { error: 'End date must be after start date.' };
  if (startDate < today) return { error: 'Start date cannot be in the past.' };
  return { startDate, endDate };
}

async function hasConflict(equipmentId, startDate, endDate, excludeId = null) {
  const filter = {
    equipment: equipmentId,
    status: { $in: ['Pending', 'Approved'] },
    startDate: { $lt: endDate },
    endDate: { $gt: startDate }
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return BorrowRequest.exists(filter);
}

async function createBorrowRequest(req, res) {
  try {
    const { equipment: equipmentId, startDate, endDate, purpose } = req.body;
    if (!equipmentId || !startDate || !endDate || !purpose?.trim()) {
      return res.status(400).json({ message: 'Equipment, dates, and purpose are required.' });
    }
    if (!mongoose.isValidObjectId(equipmentId)) return res.status(400).json({ message: 'Invalid equipment ID.' });

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) return res.status(404).json({ message: 'Equipment not found.' });
    if (equipment.status !== 'Available') return res.status(409).json({ message: 'This equipment is not currently available.' });

    const dates = validateDates(startDate, endDate);
    if (dates.error) return res.status(400).json({ message: dates.error });

    if (await hasConflict(equipmentId, dates.startDate, dates.endDate)) {
      return res.status(409).json({ message: 'Those dates conflict with an existing pending or approved request.' });
    }

    const request = await BorrowRequest.create({
      equipment: equipmentId,
      requester: req.user._id,
      startDate: dates.startDate,
      endDate: dates.endDate,
      purpose: purpose.trim()
    });

    const populated = await request.populate([
      { path: 'equipment', select: 'name category status location' },
      { path: 'requester', select: 'name email' }
    ]);
    res.status(201).json({ message: 'Borrow request submitted.', request: populated });
  } catch (error) {
    res.status(400).json({ message: 'Unable to submit borrow request.', error: error.message });
  }
}

async function getBorrowRequests(req, res) {
  try {
    const filter = req.user.role === 'admin' ? {} : { requester: req.user._id };
    const requests = await BorrowRequest.find(filter)
      .populate('equipment', 'name category status location')
      .populate('requester', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load borrow requests.', error: error.message });
  }
}

async function reviewBorrowRequest(req, res) {
  try {
    const { decision } = req.body;
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be approve or reject.' });
    }

    const request = await BorrowRequest.findById(req.params.id).populate('equipment');
    if (!request) return res.status(404).json({ message: 'Borrow request not found.' });
    if (request.status !== 'Pending') return res.status(409).json({ message: `This request is already ${request.status.toLowerCase()}.` });

    if (decision === 'reject') {
      request.status = 'Rejected';
    } else {
      if (!request.equipment || request.equipment.status !== 'Available') {
        return res.status(409).json({ message: 'The equipment is no longer available.' });
      }
      if (await hasConflict(request.equipment._id, request.startDate, request.endDate, request._id)) {
        return res.status(409).json({ message: 'Another active request conflicts with these dates.' });
      }
      request.status = 'Approved';
      request.equipment.status = 'Borrowed';
      await request.equipment.save();
    }

    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    const result = await BorrowRequest.findById(request._id)
      .populate('equipment', 'name category status location')
      .populate('requester', 'name email')
      .populate('reviewedBy', 'name email');
    res.json({ message: `Request ${decision}d successfully.`, request: result });
  } catch (error) {
    res.status(500).json({ message: 'Unable to review request.', error: error.message });
  }
}

async function returnBorrowRequest(req, res) {
  try {
    const request = await BorrowRequest.findById(req.params.id).populate('equipment');
    if (!request) return res.status(404).json({ message: 'Borrow request not found.' });

    const isOwner = request.requester.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You may only return your own approved equipment.' });
    }
    if (request.status !== 'Approved') return res.status(409).json({ message: 'Only approved requests can be returned.' });

    request.status = 'Returned';
    if (request.equipment) {
      request.equipment.status = 'Available';
      await request.equipment.save();
    }
    await request.save();

    const result = await BorrowRequest.findById(request._id)
      .populate('equipment', 'name category status location')
      .populate('requester', 'name email');
    res.json({ message: 'Equipment returned successfully.', request: result });
  } catch (error) {
    res.status(500).json({ message: 'Unable to process return.', error: error.message });
  }
}

module.exports = { createBorrowRequest, getBorrowRequests, reviewBorrowRequest, returnBorrowRequest };
