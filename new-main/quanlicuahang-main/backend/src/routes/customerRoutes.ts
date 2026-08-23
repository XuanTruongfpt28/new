import { Router } from 'express';
import { 
  createCustomerFromGoogleForm, 
  createCustomerManual,
  updateCustomer,
  deleteCustomer,
  getCustomers, 
  resetAllCustomers 
} from '../controllers/customerController';

const router = Router();

router.get('/', getCustomers);
router.post('/', createCustomerManual);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.post('/webhook', createCustomerFromGoogleForm);
router.get('/reset-all', resetAllCustomers);
router.delete('/reset-all', resetAllCustomers);

export default router;