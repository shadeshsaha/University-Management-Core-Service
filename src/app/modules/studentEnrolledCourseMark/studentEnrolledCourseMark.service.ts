import { ExamType, PrismaClient } from '@prisma/client';
import {
  DefaultArgs,
  PrismaClientOptions,
} from '@prisma/client/runtime/library';

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

const updateStudentMarks = async (payload: any) => {
  console.log(payload);

  // Faculty jokhn student er marks update korbe, tokhn "studentId", "studentEnrolledCourseId" k body te pathate hobe update er jonno. But jokhn kono faculty kono ekta student er marks update korbe tokhn faculty "studentEnrolledCourse" er data ta dekhte parbe nah, faculty sudhu "course" er data ta dekhte parbe. Tahole "studentEnrolledCourse" er moddhe "course" ta ache(prisma schema dekhle bujha jabe), tai "course" er data ta pailei "studentEnrolledCourse" er sathe relation kora jabe. So, faculty student er marks update er jonno amader body te "studentId", "courseId"(from "studentEnrolledCourse"), "academicSemesterId", "marks", "examType" eigulo pathate hobe.
};

export const StudentEnrolledCourseMarkService = {
  createStudentEnrolledCourseDefaultMark,
  updateStudentMarks,
};
