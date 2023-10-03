import {
  ExamType,
  PrismaClient,
  StudentEnrolledCourseMark,
  StudentEnrolledCourseStatus,
} from '@prisma/client';
import {
  DefaultArgs,
  PrismaClientOptions,
} from '@prisma/client/runtime/library';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import prisma from '../../../shared/prisma';
import { IStudentEnrolledCourseMarkFilterRequest } from './studentEnrolledCourseMark.interface';
import { StudentEnrolledCourseMarkUtils } from './studentEnrolledCourseMark.utils';

const createStudentEnrolledCourseDefaultMark = async (
  prismaClient: Omit<
    PrismaClient<PrismaClientOptions, never, DefaultArgs>,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
  >,
  payload: {
    studentId: string;
    studentEnrolledCourseId: string;
    academicSemesterId: string;
  }
) => {
  // console.log('payload', payload);

  // Add mark for midterm
  const isExistMidtermData =
    await prismaClient.studentEnrolledCourseMark.findFirst({
      where: {
        examType: ExamType.MIDTERM,
        student: {
          id: payload.studentId,
        },
        studentEnrolledCourse: {
          id: payload.studentEnrolledCourseId,
        },
        academicSemester: {
          id: payload.academicSemesterId,
        },
      },
    });

  if (!isExistMidtermData) {
    await prismaClient.studentEnrolledCourseMark.create({
      data: {
        student: {
          connect: {
            id: payload.studentId,
          },
        },
        studentEnrolledCourse: {
          connect: {
            id: payload.studentEnrolledCourseId,
          },
        },
        academicSemester: {
          connect: {
            id: payload.academicSemesterId,
          },
        },
        examType: ExamType.MIDTERM,
      },
    });
  }

  // Add mark for final-term
  const isExistFinaltermData =
    await prismaClient.studentEnrolledCourseMark.findFirst({
      where: {
        examType: ExamType.FINAL,
        student: {
          id: payload.studentId,
        },
        studentEnrolledCourse: {
          id: payload.studentEnrolledCourseId,
        },
        academicSemester: {
          id: payload.academicSemesterId,
        },
      },
    });

  if (!isExistFinaltermData) {
    await prismaClient.studentEnrolledCourseMark.create({
      data: {
        student: {
          connect: {
            id: payload.studentId,
          },
        },
        studentEnrolledCourse: {
          connect: {
            id: payload.studentEnrolledCourseId,
          },
        },
        academicSemester: {
          connect: {
            id: payload.academicSemesterId,
          },
        },
        examType: ExamType.FINAL,
      },
    });
  }
};

const getAllFromDB = async (
  filters: IStudentEnrolledCourseMarkFilterRequest,
  options: IPaginationOptions
): Promise<IGenericResponse<StudentEnrolledCourseMark[]>> => {
  const { limit, page } = paginationHelpers.calculatePagination(options);

  const marks = await prisma.studentEnrolledCourseMark.findMany({
    where: {
      student: {
        id: filters.studentId,
      },
      academicSemester: {
        id: filters.academicSemesterId,
      },
      studentEnrolledCourse: {
        course: {
          id: filters.courseId,
        },
      },
    },
    include: {
      studentEnrolledCourse: {
        include: {
          course: true,
        },
      },
      student: true,
    },
  });

  return {
    meta: {
      total: marks.length,
      page,
      limit,
    },
    data: marks,
  };
};

const updateStudentMarks = async (payload: any) => {
  console.log(payload);
  const { studentId, academicSemesterId, courseId, examType, marks } = payload;

  const studentEnrolledCourseMarks =
    await prisma.studentEnrolledCourseMark.findFirst({
      where: {
        student: {
          id: studentId,
        },
        academicSemester: {
          id: academicSemesterId,
        },
        studentEnrolledCourse: {
          course: {
            id: courseId,
          },
        },
        examType,
        // examType: examType, --> avabew lekha jay
      },
    });

  if (!studentEnrolledCourseMarks) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Student enrolled course mark not found'
    );
  }

  const resultGrade = StudentEnrolledCourseMarkUtils.getGradeFromMarks(marks);

  // Now update "marks" and "grade"
  const updateStudentMarks = await prisma.studentEnrolledCourseMark.update({
    where: {
      id: studentEnrolledCourseMarks.id,
    },
    data: {
      marks,
      grade: resultGrade.grade,
    },
  });

  return updateStudentMarks;

  // Faculty jokhn student er marks update korbe, tokhn "studentId", "studentEnrolledCourseId" k body te pathate hobe update er jonno. But jokhn kono faculty kono ekta student er marks update korbe tokhn faculty "studentEnrolledCourse" er data ta dekhte parbe nah, faculty sudhu "course" er data ta dekhte parbe. Tahole "studentEnrolledCourse" er moddhe "course" ta ache(prisma schema dekhle bujha jabe), tai "course" er data ta pailei "studentEnrolledCourse" er sathe relation kora jabe. So, faculty student er marks update er jonno amader body te "studentId", "courseId"(from "studentEnrolledCourse"), "academicSemesterId", "marks", "examType" eigulo pathate hobe.
};

// Midterm + FinalTerm er marks er average (total marks for the whole semester)
const updateFinalMarks = async (payload: any) => {
  // console.log('payload', payload);
  const { studentId, academicSemesterId, courseId } = payload;

  // Finding data using payload from "StudentEnrolledCourse". Cz we update the final marks in this table
  const studentEnrolledCourse = await prisma.studentEnrolledCourse.findFirst({
    where: {
      student: {
        id: studentId,
      },
      academicSemester: {
        id: academicSemesterId,
      },
      course: {
        id: courseId,
      },
    },
  });

  // "studentEnrolledCourse" a kono data na paile error throw korbe
  if (!studentEnrolledCourse) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Student enrolled course data not found!'
    );
  }

  // Data pawa gele j data ta pabo
  // console.log('studentEnrolledCourse: ', studentEnrolledCourse);

  // creating result of final marks and update
  // 1. Get Mid + Final term marks data from studentEnrolledCourseMark
  const studentEnrolledCourseMarks =
    await prisma.studentEnrolledCourseMark.findMany({
      where: {
        student: {
          id: studentId,
        },
        academicSemester: {
          id: academicSemesterId,
        },
        studentEnrolledCourse: {
          course: {
            id: courseId,
          },
        },
      },
    });

  // Found Mid+Final Term Marks
  // console.log('studentEnrolledCourseMarks: ', studentEnrolledCourseMarks);

  // data na paile error throw korbe
  if (!studentEnrolledCourseMarks.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Student enrolled course marks not found!'
    );
  }

  // 2. "studentEnrolledCourseMarks" ekhane Mid+Final Term er marks pawar por update hobe marks ta
  const midTermMarks =
    studentEnrolledCourseMarks.find(item => item.examType === ExamType.MIDTERM)
      ?.marks || 0;
  const finalTermMarks =
    studentEnrolledCourseMarks.find(item => item.examType === ExamType.FINAL)
      ?.marks || 0;
  // console.log('midTermMarks: ', midTermMarks);
  // console.log('finalTermMarks: ', finalTermMarks);

  // Final marks hobe Mid er 40% r Final er 60%
  const totalFinalMarks =
    Math.ceil(midTermMarks * 0.4) + Math.ceil(finalTermMarks * 0.6);
  // console.log('totalFinalMarks: ', totalFinalMarks);

  // Using totalFinalMarks now generate Grade and Point
  const resultGrade =
    StudentEnrolledCourseMarkUtils.getGradeFromMarks(totalFinalMarks);
  // console.log('resultGrade: ', resultGrade);

  // Update the final marks for Final Result in studentEnrolledCourse
  await prisma.studentEnrolledCourse.updateMany({
    where: {
      student: {
        id: studentId,
      },
      academicSemester: {
        id: academicSemesterId,
      },
      course: {
        id: courseId,
      },
    },
    data: {
      grade: resultGrade.grade,
      point: resultGrade.point,
      totalMarks: totalFinalMarks,
      status: StudentEnrolledCourseStatus.COMPLETED,
    },
  });

  // Find update howa Final Result [J shob course complete korse]
  const grades = await prisma.studentEnrolledCourse.findMany({
    where: {
      student: {
        id: studentId,
      },
      status: StudentEnrolledCourseStatus.COMPLETED,
    },
    include: {
      course: true,
    },
  });
  // console.log('grades: ', grades);

  // calcCGPAandGrade theke "totalCompletedCredit" r "cgpa" ashar por seta academicResult a store hobe
  const academicResult = await StudentEnrolledCourseMarkUtils.calcCGPAandGrade(
    grades
  );

  // To avoid duplication, first find previously info of a student in studentAcademicInfo
  const studentAcademicInfo = await prisma.studentAcademicInfo.findFirst({
    where: {
      student: {
        id: studentId,
      },
    },
  });

  // studentId diye kono data pawa gele tahole update korbo
  if (studentAcademicInfo) {
    // update StudentAcademicInfo
    await prisma.studentAcademicInfo.update({
      where: {
        id: studentAcademicInfo.id,
      },
      data: {
        totalCompletedCredit: academicResult.totalCompletedCredit,
        cgpa: academicResult.cgpa,
      },
    });
  }
  // studentId diye kono data na pawa gele tahole create korbo
  else {
    // after getting the result in academicResult, now we create it in StudentAcademicInfo
    await prisma.studentAcademicInfo.create({
      data: {
        student: {
          connect: {
            id: studentId,
          },
        },
        totalCompletedCredit: academicResult.totalCompletedCredit,
        cgpa: academicResult.cgpa,
      },
    });
  }

  return grades;
};

export const StudentEnrolledCourseMarkService = {
  createStudentEnrolledCourseDefaultMark,
  getAllFromDB,
  updateStudentMarks,
  updateFinalMarks,
};
