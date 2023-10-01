import express from 'express';
import { StudentEnrolledCourseMarkController } from './studentEnrolledCourseMark.controller';

const router = express.Router();

router.get('/', StudentEnrolledCourseMarkController.getAllFromDB);

router.patch(
  '/update-marks',
  StudentEnrolledCourseMarkController.updateStudentMarks
);

export const studentEnrolledCourseMarkRoutes = router;
