import { z } from 'zod';

const create = z.object({
  body: z.object({
    academicDepartmentId: z.string({
      required_error: 'Academic Department Id is required.',
    }),
    semesterRegistrationId: z.string({
      required_error: 'Semester Registration Id is required.',
    }),
    courseIds: z.array(
      z.string({
        required_error: 'Course ID is required',
      }),
      {
        required_error: 'Course IDs are required.',
      }
    ),
  }),
});

export const OfferedCourseValidations = {
  create,
};
