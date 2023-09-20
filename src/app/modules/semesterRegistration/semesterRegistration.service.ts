import {
  Prisma,
  SemesterRegistration,
  SemesterRegistrationStatus,
  StudentSemesterRegistration,
} from '@prisma/client';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import prisma from '../../../shared/prisma';
import {
  semesterRegistrationRelationalFields,
  semesterRegistrationRelationalFieldsMapper,
  semesterRegistrationSearchableFields,
} from './semesterRegistration.constants';
import { ISemesterRegistrationFilterRequest } from './semesterRegistration.interface';

const insertIntoDB = async (
  data: SemesterRegistration
): Promise<SemesterRegistration> => {
  const isAnySemesterRegistrationUpcomingOrOngoing =
    await prisma.semesterRegistration.findFirst({
      where: {
        OR: [
          {
            status: SemesterRegistrationStatus.UPCOMING,
          },
          {
            status: SemesterRegistrationStatus.ONGOING,
          },
        ],
      },
    });

  if (isAnySemesterRegistrationUpcomingOrOngoing) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `There is already an ${isAnySemesterRegistrationUpcomingOrOngoing.status} registration`
    );
  }

  const result = await prisma.semesterRegistration.create({
    data,
  });
  return result;
};

const getAllFromDB = async (
  filters: ISemesterRegistrationFilterRequest,
  options: IPaginationOptions
): Promise<IGenericResponse<SemesterRegistration[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      OR: semesterRegistrationSearchableFields.map(field => ({
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
        if (semesterRegistrationRelationalFields.includes(key)) {
          return {
            [semesterRegistrationRelationalFieldsMapper[key]]: {
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

  const whereConditions: Prisma.SemesterRegistrationWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.semesterRegistration.findMany({
    include: {
      academicSemester: true,
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
  const total = await prisma.semesterRegistration.count({
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

const getByIdFromDB = async (
  id: string
): Promise<SemesterRegistration | null> => {
  const result = await prisma.semesterRegistration.findUnique({
    where: {
      id,
    },
    include: {
      academicSemester: true,
    },
  });
  return result;
};

// UPCOMING > ONGOING  > ENDED => adding condition sequentially
const updateOneInDB = async (
  id: string,
  payload: Partial<SemesterRegistration>
): Promise<SemesterRegistration> => {
  // Checking updating data exist or not
  const isExist = await prisma.semesterRegistration.findUnique({
    where: {
      id,
    },
  });

  if (!isExist) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Semester Data Not Found');
  }

  // Upcoming theke Ongoing korte parbo. Ongoing theke Ended korte parbo
  // console.log(payload.status);
  // UPCOMING > ONGOING
  if (
    payload.status &&
    isExist.status === SemesterRegistrationStatus.UPCOMING &&
    payload.status !== SemesterRegistrationStatus.ONGOING
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Can only move from UPCOMING to ONGOING'
    );
    /**
     * payload.status => jei data pathacchi setar status jodi thake
     * isExist.status === SemesterRegistrationStatus.UPCOMING => tahole amra check korbo j amader jei data ta already database a ache(isExist), setar moddhe status ta jodi "UPCOMING" hoy tahole "ONGOING" a change korte dibo
     * payload.status !== SemesterRegistrationStatus.ONGOING => tahole ekhane amra check kortesi payload er moddhe j status ta pathacchi, shei status ta jodi "ONGOING" er shoman na hoy tahole ekta error diye dicchi.
     */
  }

  // ONGOING > ENDED
  if (
    payload.status &&
    isExist.status === SemesterRegistrationStatus.ONGOING &&
    payload.status !== SemesterRegistrationStatus.ENDED
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Can only move from ONGOING to ENDED'
    );
    /**
     * payload.status => jei data pathacchi setar status jodi thake
     * isExist.status === SemesterRegistrationStatus.ONGOING => tahole amra check korbo j amader jei data ta already database a ache(isExist), setar moddhe status ta jodi "ONGOING" hoy tahole "ENDED" a change korte dibo
     * payload.status !== SemesterRegistrationStatus.ENDED => tahole ekhane amra check kortesi payload er moddhe j status ta pathacchi, shei status ta jodi "ENDED" er shoman na hoy tahole ekta error diye dicchi.
     */
  }

  const result = await prisma.semesterRegistration.update({
    where: {
      id,
    },
    data: payload,
    include: {
      academicSemester: true,
    },
  });
  return result;
};

const deleteByIdFromDB = async (id: string): Promise<SemesterRegistration> => {
  const result = await prisma.semesterRegistration.delete({
    where: {
      id,
    },
    include: {
      academicSemester: true,
    },
  });
  return result;
};

const startMyRegistration = async (
  authUserId: string
): Promise<{
  semesterRegistration: SemesterRegistration | null;
  studentSemesterRegistration: StudentSemesterRegistration | null;
}> => {
  // Get student data [studentInfo]
  const studentInfo = await prisma.student.findFirst({
    where: {
      studentId: authUserId,
    },
  });
  // console.log(studentInfo);

  if (!studentInfo) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Student information not found!'
    );
  }

  // If a semester registration is not on-going, we check the semester registration is on-going or up-coming
  // Now get semesterRegistrationInfo
  const semesterRegistrationInfo = await prisma.semesterRegistration.findFirst({
    where: {
      // check korbo kono semester registration on-going/up-coming ache kina
      status: {
        in: [
          SemesterRegistrationStatus.ONGOING,
          SemesterRegistrationStatus.UPCOMING,
        ],
      },
    },
  });
  // console.log('semesterRegistrationInfo: ', semesterRegistrationInfo);

  // If a semester is up-coming, we can not register a student into a semester. It will throw an error.
  if (
    semesterRegistrationInfo?.status === SemesterRegistrationStatus.UPCOMING
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Registration is not started yet!'
    );
  }

  // A student can registration in a semester once validation ----->
  // studentRegistration value paile dekhabe
  let studentRegistration = await prisma.studentSemesterRegistration.findFirst({
    where: {
      student: {
        id: studentInfo?.id,
      },
      semesterRegistration: {
        id: semesterRegistrationInfo?.id,
      },
    },
  });

  // "studentRegistration" data jodi peye jai ba student er registration kora age theke thake, tahole notun kore create korbo na. Na thakle notun kore create krobo.
  if (!studentRegistration) {
    // When a semester is on-going, we will allow a student to do registration
    studentRegistration = await prisma.studentSemesterRegistration.create({
      // Relation er moddhei data k directly connect korte pari. We have student and semesterRegistration info
      data: {
        // connect student information
        student: {
          connect: {
            id: studentInfo?.id,
          },
        }, // prisma schema te "StudentSemesterRegistration" a "relation" jei name a ache shei name ta dite hobe

        // connect semester registration
        semesterRegistration: {
          connect: {
            id: semesterRegistrationInfo?.id,
          },
        }, // "student" er motoi same rule "semesterRegistration" a
      },
    });
  }

  return {
    semesterRegistration: semesterRegistrationInfo,
    studentSemesterRegistration: studentRegistration,
  };
};

export const SemesterRegistrationService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateOneInDB,
  deleteByIdFromDB,
  startMyRegistration,
};
