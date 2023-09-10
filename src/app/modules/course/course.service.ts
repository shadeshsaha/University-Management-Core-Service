import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import prisma from '../../../shared/prisma';
import { ICourseCreateData } from './course.interface';

const insertIntoDB = async (data: ICourseCreateData): Promise<any> => {
  const { preRequisiteCourses, ...courseData } = data;
  // console.log(preRequisiteCourses);
  // console.log(courseData);

  // Started Transaction & Rool-Back
  const newCourse = await prisma.$transaction(async transactionClient => {
    const result = await transactionClient.course.create({
      data: courseData,
    });

    if (!result) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Unable To Create New Course');
    }

    if (preRequisiteCourses && preRequisiteCourses.length > 0) {
      for (let index = 0; index < preRequisiteCourses.length; index++) {
        const createPrerequisite =
          await transactionClient.courseToPrerequisite.create({
            data: {
              courseId: result.id, // Current course jeta create hocche setar ID
              preRequisiteId: preRequisiteCourses[index].courseId, // preRequisiteCourses er array te jei course gulo pathacchi, setar array theke nibo
            },
          });
        console.log('createPrerequisite', createPrerequisite);
      }
    }
    return result;
  });

  if (newCourse) {
    const responseData = await prisma.course.findUnique({
      where: {
        id: newCourse.id, // create howa data er ID dibe(hover korle bujha jabe)
      },
      include: {
        preRequisite: {
          include: {
            preRequisite: true, // pre-requisite course dekhabe
          },
        },
        preRequisiteFor: {
          include: {
            course: true, // porer course dekhabe
          },
        },
      },
    });

    return responseData;
  }

  throw new ApiError(httpStatus.BAD_REQUEST, 'Unable To Create New Course');
};

export const CourseService = {
  insertIntoDB,
};
