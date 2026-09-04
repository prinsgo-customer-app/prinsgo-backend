const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
const {
  listCategories,
  createCategory,
  updateCategory,
  listWorkers,
  deleteCategory,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
} = require('../controllers/adminWorkerController');

router.use(protectAdmin);

router.get('/categories', listCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/', listWorkers);
router.post('/', createWorker);
router.get('/:id', getWorkerById);
router.put('/:id', updateWorker);
router.delete('/:id', deleteWorker);

module.exports = router;
