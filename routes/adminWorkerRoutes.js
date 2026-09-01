const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
const {
  listCategories,
  createCategory,
  updateCategory,
  listWorkers,
} = require('../controllers/adminWorkerController');

router.use(protectAdmin);

router.get('/categories', listCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);

router.get('/', listWorkers);

module.exports = router;
