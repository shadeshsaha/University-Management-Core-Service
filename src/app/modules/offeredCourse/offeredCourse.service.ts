import { OfferedCourse, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import prisma from '../../../shared/prisma';
import { asyncForEach } from '../../../shared/utils';
import {
  offeredCourseRelationalFields,
  offeredCourseRelationalFieldsMapper,
  offeredCourseSearchableFields,
} from './offeredCourse.constants';
import {
  ICreateOfferedCourse,
  IOfferedCourseFilterRequest,
} from './offeredCourse.interface';

const insertIntoDB = async (
  data: ICreateOfferedCourse
): Promise<OfferedCourse[]> => {
  const { academicDepartmentId, semesterRegistrationId, courseIds } = data;
  const result: OfferedCourse[] = [];

  await asyncForEach(courseIds, async (courseId: string) => {
    // jei id gulo diye request kortesi,shei id gulo data gulo db te exist kortese kina. thakle create korbo na
    const alreadyExist = await prisma.offeredCourse.findFirst({
      where: {
        academicDepartmentId,
        semesterRegistrationId,
        courseId,
      },
    });

    // Data exist na thakle create korbe
    if (!alreadyExist) {
      const insertOfferedCourse = await prisma.offeredCourse.create({
        data: {
          academicDepartmentId,
          semesterRegistrationId,
          courseId,
        },
        include: {
          academicDepartment: true,
          semesterRegistration: true,
          course: true,
        },
      });
      result.push(insertOfferedCourse);
    }
  });
  return result;
};

const getAllFromDB = async (
  filters: IOfferedCourseFilterRequest,
  options: IPaginationOptions
): Promise<IGenericResponse<OfferedCourse[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      OR: offeredCourseSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => {
        if (offeredCourseRelationalFields.includes(key)) {
          return {
            [offeredCourseRelationalFieldsMapper[key]]: {
              id: (filterData as any)[key],
            },
          };
        } else {
          return {
            [key]: {
              equals: (filterData as any)[key],
            },
          };
        }
      }),
    });
  }

  const whereConditions: Prisma.OfferedCourseWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.offeredCourse.findMany({
    include: {
      semesterRegistration: true,
      course: true,
      academicDepartment: true,
    },
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
  });
  const total = await prisma.offeredCourse.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

export const OfferedCourseService = {
  insertIntoDB,
  getAllFromDB,
};
