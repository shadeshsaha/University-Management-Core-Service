import { Building, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import prisma from '../../../shared/prisma';
import { buildingSearchAbleFields } from './building.constants';
import { IBuildingFilterRequest } from './building.interface';

const insertIntoDB = async (data: Building): Promise<Building> => {
  const result = await prisma.building.create({
    data,
  });
  return result;
};

const getAllFromDB = async (
  filters: IBuildingFilterRequest,
  options: IPaginationOptions
): Promise<IGenericResponse<Building[]>> => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options); // For Pagination
  const { searchTerm } = filters; // For Search Term (Query te jegulo diye search kora hobe)

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      OR: buildingSearchAbleFields.map(building => ({
        [building]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  const whereConditions: Prisma.BuildingWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.building.findMany({
    skip,
    take: limit,
    where: whereConditions,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: 'desc',
          },
  });

  const total = await prisma.building.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

export const BuildingService = {
  insertIntoDB,
  getAllFromDB,
};
