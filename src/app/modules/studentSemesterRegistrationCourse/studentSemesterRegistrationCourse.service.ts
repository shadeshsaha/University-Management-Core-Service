import { SemesterRegistrationStatus } from '@prisma/client';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import prisma from '../../../shared/prisma';
import { IEnrollCoursePayload } from '../semesterRegistration/semesterRegistration.interface';

// Student enroll into a course
const enrollIntoCourse = async (
  authUserId: string,
  payload: IEnrollCoursePayload
): Promise<{ message: string }> => {
  // console.log('authUserId:', authUserId, 'payload:', payload);

  // Get Student Information
  const student = await prisma.student.findFirst({
    where: {
      studentId: authUserId,
    },
  });
  // console.log('student:', student);

  // Get Semester Registration Info Is It Ongoing Or Not
  const semesterRegistration = await prisma.semesterRegistration.findFirst({
    where: {
      status: SemesterRegistrationStatus.ONGOING,
    },
  });
  // console.log('semesterRegistration: ', semesterRegistration);

  // check offeredCourse is exist or not
  const offeredCourse = await prisma.offeredCourse.findFirst({
    where: {
      id: payload.offeredCourseId,
    },
    include: {
      course: true,
    },
  });

  // check offeredCourseSection is exist or not
  const offeredCourseSection = await prisma.offeredCourseSection.findFirst({
    where: {
      id: payload.offeredCourseSectionId,
    },
  });

  // By "semesterRegistration" & "student" we got their ids. And in payload we got "offeredCourseId" & "offeredCourseSectionId". Finally we got 4 things to do this task.
  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student Not Found');
  }
  if (!semesterRegistration) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Semester Registration Not Found');
  }
  if (!offeredCourse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Offered Course Not Found');
  }
  if (!offeredCourseSection) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Offered Course Section Not Found'
    );
  }

  // Check enroll students count is bigger than maximum capacity. If bigger than max. capacity, we don't allow any student to enroll.
  if (
    offeredCourseSection.maxCapacity &&
    offeredCourseSection.currentlyEnrolledStudent &&
    offeredCourseSection.currentlyEnrolledStudent >=
      offeredCourseSection.maxCapacity
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Student capacity is full!');
  }

  // console.log(offeredCourse);
  await prisma.$transaction(async transactionClient => {
    await transactionClient.studentSemesterRegistrationCourse.create({
      data: {
        studentId: student?.id,
        semesterRegistrationId: semesterRegistration?.id,
        offeredCourseId: payload.offeredCourseId,
        offeredCourseSectionId: payload.offeredCourseSectionId,
      },
    });

    // How many students currently enrolled in a course, make a count of it
    await transactionClient.offeredCourseSection.update({
      where: {
        id: payload.offeredCourseSectionId, // here we have offeredCourseSectionId
      },
      data: {
        currentlyEnrolledStudent: {
          increment: 1,
        },
      },
    });

    // How many credits are taken, make a count of it
    await transactionClient.studentSemesterRegistration.updateMany({
      where: {
        student: {
          id: student.id,
        },
        semesterRegistration: {
          id: semesterRegistration.id,
        },
      },
      data: {
        totalCreditsTaken: {
          increment: offeredCourse.course.credits, // total credit ekhan theke dhorbe r increment korbe
        },
      },
    });
  });

  return {
    message: 'Successfully enrolled into course!',
  };
};

// Student withdraw a course
const withdrawFromCourse = async (
  authUserId: string,
  payload: IEnrollCoursePayload
): Promise<{ message: string }> => {
  // console.log('authUserId:', authUserId, 'payload:', payload);

  // Get Student Information
  const student = await prisma.student.findFirst({
    where: {
      studentId: authUserId,
    },
  });
  // console.log('student:', student);

  // Get Semester Registration Info Is It Ongoing Or Not
  const semesterRegistration = await prisma.semesterRegistration.findFirst({
    where: {
      status: SemesterRegistrationStatus.ONGOING,
    },
  });
  // console.log('semesterRegistration: ', semesterRegistration);

  // check offeredCourse is exist or not
  const offeredCourse = await prisma.offeredCourse.findFirst({
    where: {
      id: payload.offeredCourseId,
    },
    include: {
      course: true,
    },
  });

  // By "semesterRegistration" & "student" we got their ids. And in payload we got "offeredCourseId". Finally we got 3 things to do this task.
  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student Not Found');
  }
  if (!semesterRegistration) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Semester Registration Not Found');
  }
  if (!offeredCourse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Offered Course Not Found');
  }

  // console.log(offeredCourse);
  await prisma.$transaction(async transactionClient => {
    await transactionClient.studentSemesterRegistrationCourse.delete({
      // composite key er upor nirvor kore jokhn kono ekta record k delete korte jai, tokhn ei composite key gulo k "where" er moddhe ekta property akare boshate hoy.
      where: {
        semesterRegistrationId_studentId_offeredCourseId: {
          semesterRegistrationId: semesterRegistration?.id,
          studentId: student?.id,
          offeredCourseId: payload.offeredCourseId,
        },
      },
    });

    // How many students currently withdraw from a course, make a count of it
    await transactionClient.offeredCourseSection.update({
      where: {
        id: payload.offeredCourseSectionId, // here we have offeredCourseSectionId
      },
      data: {
        currentlyEnrolledStudent: {
          decrement: 1,
        },
      },
    });

    // How many credits are taken, make a count of it
    await transactionClient.studentSemesterRegistration.updateMany({
      where: {
        student: {
          id: student.id,
        },
        semesterRegistration: {
          id: semesterRegistration.id,
        },
      },
      data: {
        totalCreditsTaken: {
          decrement: offeredCourse.course.credits, // total credit ekhan theke kombe r decrement korbe
        },
      },
    });
  });

  return {
    message: 'Successfully withdraw from this course!',
  };
};

export const StudentSemesterRegistrationCourseService = {
  enrollIntoCourse,
  withdrawFromCourse,
};
