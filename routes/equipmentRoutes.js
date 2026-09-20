const express = require('express');
const controller = require('../controllers/equipmentController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/', controller.getEquipment);
router.get('/:id', controller.getEquipmentById);
router.post('/', protect, requireAdmin, controller.createEquipment);
router.put('/:id', protect, requireAdmin, controller.updateEquipment);
router.delete('/:id', protect, requireAdmin, controller.deleteEquipment);

module.exports = router;
