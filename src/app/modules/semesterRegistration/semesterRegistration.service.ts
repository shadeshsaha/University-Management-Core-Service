import {
  Course,
  OfferedCourse,
  Prisma,
  SemesterRegistration,
  SemesterRegistrationStatus,
  StudentEnrolledCourseStatus,
  StudentSemesterRegistration,
  StudentSemesterRegistrationCourse,
} from '@prisma/client';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import prisma from '../../../shared/prisma';
import { asyncForEach } from '../../../shared/utils';
import { StudentEnrolledCourseMarkService } from '../studentEnrolledCourseMark/studentEnrolledCourseMark.service';
import { StudentSemesterPaymentService } from '../studentSemesterPayment/studentSemesterPayment.service';
import { StudentSemesterRegistrationCourseService } from '../studentSemesterRegistrationCourse/studentSemesterRegistrationCourse.service';
import {
  semesterRegistrationRelationalFields,
  semesterRegistrationRelationalFieldsMapper,
  semesterRegistrationSearchableFields,
} from './semesterRegistration.constants';
import {
  IEnrollCoursePayload,
  ISemesterRegistrationFilterRequest,
} from './semesterRegistration.interface';
import { SemesterRegistrationUtils } from './semesterRegistration.utils';

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

// Student enroll into a course
const enrollIntoCourse = async (
  authUserId: string,
  payload: IEnrollCoursePayload
): Promise<{ message: string }> => {
  return StudentSemesterRegistrationCourseService.enrollIntoCourse(
    authUserId,
    payload
  );
};

// Student withdraw a course
const withdrawFromCourse = async (
  authUserId: string,
  payload: IEnrollCoursePayload
): Promise<{ message: string }> => {
  return StudentSemesterRegistrationCourseService.withdrawFromCourse(
    authUserId,
    payload
  );
};

// Confirming A Student's Registration
const confirmMyRegistration = async (
  authUserId: string
): Promise<{ message: string }> => {
  // Check semester registration is ongoing or not
  const semesterRegistration = await prisma.semesterRegistration.findFirst({
    where: {
      status: SemesterRegistrationStatus.ONGOING,
    },
  });

  // Checking minCredit and maxCredit fullfill or not for register in a semester(semesterRegistration)
  const studentSemesterRegistration =
    await prisma.studentSemesterRegistration.findFirst({
      where: {
        semesterRegistration: {
          id: semesterRegistration?.id,
        },
        student: {
          studentId: authUserId,
        },
      },
    });

  // console.log('semesterRegistration: ', semesterRegistration);
  // console.log('studentSemesterRegistration: ', studentSemesterRegistration);

  // Student semester registration na korle "studentSemesterRegistration"a kono data thakbe na. na thakle error dibe
  if (!studentSemesterRegistration) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'You are not recognized for this semester!'
    );
  }

  if (studentSemesterRegistration.totalCreditsTaken === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'You are not enrolled in any course!'
    );
  }

  // jokhn "studentSemesterRegistration" er data thakbe, "totalCreditsTaken" ta "minCredit" r "maxCredit" er moddhe ache kina seta check korte hbe.
  // tct = 3
  // MinC = 3
  // MaxC = 6
  // tct < minC || tct > maxC
  if (
    studentSemesterRegistration.totalCreditsTaken &&
    semesterRegistration?.minCredit &&
    semesterRegistration.maxCredit &&
    (studentSemesterRegistration.totalCreditsTaken <
      semesterRegistration?.minCredit ||
      studentSemesterRegistration.totalCreditsTaken >
        semesterRegistration?.maxCredit)
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `You can only take ${semesterRegistration.minCredit} to ${semesterRegistration.maxCredit} credits`
    );
  }

  // R jokhn "totalCreditsTaken" ta "minCredit" r "maxCredit" er moddhe thakbe tokhn update korte hobe.
  await prisma.studentSemesterRegistration.update({
    where: {
      id: studentSemesterRegistration.id,
    },
    data: {
      isConfirmed: true,
    },
  });

  return {
    message: 'Your registration is confirmed!',
  };
};

// Show registration data/enrolled course data
const getMyRegistration = async (authUserId: string) => {
  // check semester registration is ongoing or not. Ongoing hole ekhane data ashbe ekta
  const semesterRegistration = await prisma.semesterRegistration.findFirst({
    where: {
      status: SemesterRegistrationStatus.ONGOING,
    },
    include: {
      academicSemester: true,
    },
  });

  // semesterRegistration er data pawar pore studentSemesterRegistrationer data find korte hbe
  const studentSemesterRegistration =
    await prisma.studentSemesterRegistration.findFirst({
      where: {
        semesterRegistration: {
          id: semesterRegistration?.id,
        },
        student: {
          studentId: authUserId,
        },
      },
      include: {
        student: true,
      },
    });

  return { semesterRegistration, studentSemesterRegistration };
};

const startNewSemester = async (id: string): Promise<{ message: string }> => {
  // Jei semester ta reg er por start korte chacchi seta find kora holo
  const semesterRegistration = await prisma.semesterRegistration.findUnique({
    where: {
      id,
    },
    include: {
      academicSemester: true,
    },
  });
  // console.log('semesterRegistration: ', semesterRegistration);

  if (!semesterRegistration) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Semester Registration Not Found!'
    );
  }

  // Jei semester er reg sesh hoynai, seta start korte gele ei error dibe
  if (semesterRegistration.status !== SemesterRegistrationStatus.ENDED) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Semester Registration Is Not Ended Yet!'
    );
  }

  // Jodi already semester start hoye thake, means "isCurrent" jodi age thekei true thake tahole ekta msg dibe.
  // if (semesterRegistration.academicSemester.isCurrent) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Semester Is Already Started!');
  // }

  await prisma.$transaction(async prismaTransactionClient => {
    // At a time 1 tai semester start hobe. 1 ta semester start howar por r kono semester start hote parbe nah. New 1ta semester start hole baki shob semester er "isCurrent" status "false" hoye jabe. jeta start hbe seta only true thakbe.
    await prismaTransactionClient.academicSemester.updateMany({
      where: {
        isCurrent: true,
      },
      data: {
        isCurrent: false,
      },
    });

    // semester er "isCurrent" status "false" hoye jawar pore jei semester start korbo seta update kore dibo "isCurrent" status "true" hishebe [ Jei semester er reg sesh, shei semester start er jonno update status er kaj kora holo. Update status true hole semester start hoye jabe.]
    await prismaTransactionClient.academicSemester.update({
      where: {
        id: semesterRegistration.academicSemester.id,
      },
      data: {
        isCurrent: true,
      },
    });

    // student er enroll kora course er data find er kaj
    const studentSemesterRegistrations =
      await prisma.studentSemesterRegistration.findMany({
        where: {
          semesterRegistration: {
            id,
          },
          isConfirmed: true,
        },
      });
    // console.log('studentSemesterRegistrations: ', studentSemesterRegistrations);

    // Student er enroll kora course er data find kora.
    await asyncForEach(
      studentSemesterRegistrations,
      async (studentSemReg: StudentSemesterRegistration) => {
        // Creating Semester Payment For Courses
        if (studentSemReg.totalCreditsTaken) {
          const totalSemesterPaymentAmount =
            studentSemReg.totalCreditsTaken * 5000;

          await StudentSemesterPaymentService.createSemesterPayment(
            prismaTransactionClient,
            {
              studentId: studentSemReg.studentId,
              academicSemesterId: semesterRegistration.academicSemesterId,
              totalPaymentAmount: totalSemesterPaymentAmount,
            }
          );
        }

        // console.log('studentSemReg: ', studentSemReg);
        // J J course a enroll kora hoise ekta student er seshob er data eikhane dekha jabe.
        const studentSemesterRegistrationCourses =
          await prismaTransactionClient.studentSemesterRegistrationCourse.findMany(
            {
              where: {
                semesterRegistration: {
                  id,
                },
                student: {
                  id: studentSemReg.studentId,
                },
              },
              include: {
                offeredCourse: {
                  include: {
                    course: true,
                  },
                },
              },
            }
          );
        // console.log('studentSemesterRegistrationCourses: ', studentSemesterRegistrationCourses);

        await asyncForEach(
          studentSemesterRegistrationCourses,
          async (
            item: StudentSemesterRegistrationCourse & {
              offeredCourse: OfferedCourse & {
                course: Course;
              };
            }
          ) => {
            const isExistEnrolledData =
              await prismaTransactionClient.studentEnrolledCourse.findFirst({
                where: {
                  studentId: item.studentId,
                  courseId: item.offeredCourse.courseId,
                  academicSemesterId: semesterRegistration.academicSemesterId,
                },
              });

            // studentId, courseId, academicSemesterId diye check korbo age theke kono data "StudentEnrolledCourse" table a ache kina. Jodi thake tahole duplicate data add korte dibona, na thakle data add korte dibo.
            if (!isExistEnrolledData) {
              // student der enroll kora course er data insert hobe "StudentEnrolledCourse" table a.
              const enrolledCourseData = {
                studentId: item.studentId,
                courseId: item.offeredCourse.courseId,
                academicSemesterId: semesterRegistration.academicSemesterId,
              };

              const studentEnrolledCourseData =
                await prismaTransactionClient.studentEnrolledCourse.create({
                  data: enrolledCourseData,
                });

              // Adding student's course mark
              await StudentEnrolledCourseMarkService.createStudentEnrolledCourseDefaultMark(
                prismaTransactionClient,
                {
                  // studentId: studentEnrolledCourseData.studentId
                  studentId: item.studentId,
                  studentEnrolledCourseId: studentEnrolledCourseData.id,
                  academicSemesterId: semesterRegistration.academicSemesterId,
                }
              );
            }
          }
        );
      }
    );
  });

  return {
    message: 'Semester Started Successfully!',
  };
};

const getMySemesterRegistrationCourses = async (authUserId: string) => {
  // console.log('authUser', authUserId);

  // Using authUserId check stuent exist or not
  const student = await prisma.student.findFirst({
    where: {
      studentId: authUserId,
    },
  });
  // console.log('Student', student);

  // After getting student data, check semester registration is ongoing or upcoming. When semester registration is ongoing or upcoming, then will see available courses
  const semesterRegistration = await prisma.semesterRegistration.findFirst({
    where: {
      status: {
        in: [
          SemesterRegistrationStatus.UPCOMING,
          SemesterRegistrationStatus.ONGOING,
        ],
      },
    },
    include: {
      academicSemester: true,
    },
  });
  // console.log('semesterRegistration: ', semesterRegistration);

  if (!semesterRegistration) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'No semester registration is ongoing or upcoming!'
    );
  }

  // 1. Find student's completed courses from studentEnrolledCourse (Karon complete howa course ei table a thake)
  const studentCompletedCourse = await prisma.studentEnrolledCourse.findMany({
    where: {
      status: StudentEnrolledCourseStatus.COMPLETED,
      student: {
        id: student?.id, // 1st way
        // studentId: authUserId, // 2nd way
      },
    },
    include: {
      course: true,
    },
  });
  // console.log('studentCompletedCourse: ', studentCompletedCourse);

  // 2. Enroll kora course ber kora [currently ekjon student jeshob courses niyeche]
  const studentCurrentSemesterTakenCourse =
    await prisma.studentSemesterRegistrationCourse.findMany({
      where: {
        student: {
          id: student?.id,
        },
        semesterRegistration: {
          id: semesterRegistration?.id,
        },
      },
      include: {
        offeredCourse: true,
        offeredCourseSection: true,
      },
    });
  // console.log('studentCurrentSemesterTakenCourse: ', studentCurrentSemesterTakenCourse);

  // 3. University's offered courses list from offeredCourse table
  const offeredCourse = await prisma.offeredCourse.findMany({
    where: {
      semesterRegistration: {
        id: semesterRegistration?.id,
      },
      academicDepartment: {
        id: student?.academicDepartmentId,
      },
    },
    include: {
      course: {
        include: {
          preRequisite: {
            include: {
              preRequisite: true,
            },
          },
        },
      },
      offeredCourseSections: {
        include: {
          offeredCourseClassSchedules: {
            include: {
              room: {
                include: {
                  building: true,
                },
              },
            },
          },
        },
      },
    },
  });
  // console.log('offeredCourse: ', offeredCourse);

  // University theke offer kora course theke student er complete kora course remove korte hobe.
  const availableCourses = SemesterRegistrationUtils.getAvailableCourses(
    studentCompletedCourse,
    studentCurrentSemesterTakenCourse,
    offeredCourse
  );
  // console.log('availableCourses: ', availableCourses);
  return availableCourses;
};

export const SemesterRegistrationService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateOneInDB,
  deleteByIdFromDB,
  startMyRegistration,
  enrollIntoCourse,
  withdrawFromCourse,
  confirmMyRegistration,
  getMyRegistration,
  startNewSemester,
  getMySemesterRegistrationCourses,
};
