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

const update = z.object({
  body: z.object({
    semesterRegistrationId: z.string().optional(),
    courseId: z.string().optional(),
    academicDepartmentId: z.string().optional(),
  }),
});

export const OfferedCourseValidations = {
  create,
  update,
};
