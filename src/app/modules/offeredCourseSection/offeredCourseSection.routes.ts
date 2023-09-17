import express from 'express';
import { OfferedCourseSectionController } from './offeredCourseSection.controller';

const router = express.Router();

router.get('/', OfferedCourseSectionController.getAllFromDB);
router.get('/:id', OfferedCourseSectionController.getByIdFromDB);

router.post('/', OfferedCourseSectionController.insertIntoDB);

router.patch('/:id', OfferedCourseSectionController.updateOneInDB);

export const offeredCourseSectionRoutes = router;
