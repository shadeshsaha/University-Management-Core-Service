import express from 'express';
import { OfferedCourseSectionController } from './offeredCourseSection.controller';

const router = express.Router();

router.get('/', OfferedCourseSectionController.getAllFromDB);

router.post('/', OfferedCourseSectionController.insertIntoDB);

export const offeredCourseSectionRoutes = router;
