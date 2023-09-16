import { OfferedCourseSection } from '@prisma/client';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import prisma from '../../../shared/prisma';

const insertIntoDB = async (data: any): Promise<OfferedCourseSection> => {
  // "offeredCourseId" er kono data na thakle "OfferedCourseSection" create korte parbo na. Er jonno "offeredCourseId" exist korte hobe. setar validation er kaj niche...
  const isExistOfferedCourse = await prisma.offeredCourse.findFirst({
    where: {
      id: data.offeredCourseId,
    },
  });

  console.log(isExistOfferedCourse);
  console.log('data: ', data);

  if (!isExistOfferedCourse) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Offered course does not exist');
  }

  data.semesterRegistrationId = isExistOfferedCourse.semesterRegistrationId;

  const result = await prisma.offeredCourseSection.create({
    data,
  });
  return result;
};

export const OfferedCourseSectionService = {
  insertIntoDB,
};
