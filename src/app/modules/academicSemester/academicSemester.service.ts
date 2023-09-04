import { AcademicSemester, Prisma, PrismaClient } from '@prisma/client';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { IAcademicSemesterFilterRequest } from './academicSemester.interface';
import { AcademicSemesterSearchAbleFields } from './academicSemeter.contants';

const prisma = new PrismaClient();

const insertIntoDB = async (
  academicSemesterData: AcademicSemester
): Promise<AcademicSemester> => {
  const result = await prisma.academicSemester.create({
    data: academicSemesterData,
  });
  return result;
};

const getAllFromDB = async (
  filters: IAcademicSemesterFilterRequest,
  options: IPaginationOptions
): Promise<IGenericResponse<AcademicSemester[]>> => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options); // For Pagination
  const { searchTerm, ...filterData } = filters; // For Search Term (Query te jegulo diye search kora hobe)
  // console.log(filterData, filters);

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      OR: AcademicSemesterSearchAbleFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.AcademicSemesterWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.academicSemester.findMany({
    where: whereConditions,
    skip,
    take: limit,
  });

  // const result = await prisma.academicSemester.findMany({
  //   where: {
  //     // OR: [
  //     //   {
  //     //     title: {
  //     //       contains: searchTerm,
  //     //       mode: 'insensitive',
  //     //     },
  //     //   },
  //     //   {
  //     //     code: {
  //     //       contains: searchTerm,
  //     //       mode: 'insensitive',
  //     //     },
  //     //   },
  //     // ], // -> Ei part tukur kaj amra "andConditions" a kore felsi. Same to same.
  //   },
  //   skip,
  //   take: limit,
  // });

  const total = await prisma.academicSemester.count();

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

export const AcademicSemesterService = {
  insertIntoDB,
  getAllFromDB,
};
