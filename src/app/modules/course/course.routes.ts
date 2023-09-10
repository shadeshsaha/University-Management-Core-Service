import express from 'express';
import { CourseController } from './course.controller';

const router = express.Router();

router.get('/', CourseController.getAllFromDB);
router.get('/:id', CourseController.getByIdFromDB);

router.post('/', CourseController.insertIntoDB);

export const courseRoutes = router;
