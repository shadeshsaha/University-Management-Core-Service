import { z } from 'zod';

const create = z.object({
  body: z.object({
    startDate: z.string({
      required_error: 'Start date is required',
    }),
    endDate: z.string({
      required_error: 'End date is required',
    }),
    academicSemesterId: z.string({
      required_error: 'Academic semester id is required',
    }),
    minCredit: z.number({
      required_error: 'Min credit is required',
    }),
    maxCredit: z.number({
      required_error: 'Max credit is required',
    }),
  }),
});

export const SemesterRegistrationValidation = {
  create,
};
