import express from 'express';
import { OfferedCourseClassScheduleController } from './offeredCourseClassSchedule.controller';

const router = express.Router();

router.get('/', OfferedCourseClassScheduleController.getAllFromDB);
router.get('/:id', OfferedCourseClassScheduleController.getByIdFromDB);

router.post('/', OfferedCourseClassScheduleController.insertIntoDB);

router.patch('/:id', OfferedCourseClassScheduleController.updateOneInDB);

export const offeredCourseClassScheduleRoutes = router;
