import { OfferedCourseClassSchedule } from '@prisma/client';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import prisma from '../../../shared/prisma';

const insertIntoDB = async (
  data: OfferedCourseClassSchedule
): Promise<OfferedCourseClassSchedule> => {
  const alreadyBookedRoomOnDay =
    await prisma.offeredCourseClassSchedule.findMany({
      where: {
        dayOfWeek: data.dayOfWeek,
        room: {
          id: data.roomId,
        },
      },
    });
  // console.log(alreadyBookedRoomOnDay);

  const existingSlots = alreadyBookedRoomOnDay.map(schedule => ({
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    dayOfWeek: schedule.dayOfWeek,
  }));
  // console.log(existingSlots);

  // console.log(data);
  const newSlot = {
    startTime: data.startTime,
    endTime: data.endTime,
    dayOfWeek: data.dayOfWeek,
  };
  // console.log('existingSlots: ', existingSlots);
  // console.log('newSlot:', newSlot);

  for (const slot of existingSlots) {
    const existingStartTime = new Date(`1970-01-01T${slot.startTime}:00`);
    const existingEndTime = new Date(`1970-01-01T${slot.endTime}:00`);
    const newStartTime = new Date(`1970-01-01T${newSlot.startTime}:00`);
    const newEndTime = new Date(`1970-01-01T${newSlot.endTime}:00`);

    // console.log('existingStartTime:', existingStartTime);
    // console.log('existingEndTime:', existingEndTime);
    // console.log('newStartTime:', newStartTime);
    // console.log('newEndTime:', newEndTime);

    // existing: 12:30 - 13:30
    // new slot: 12:50 - 13:50 => eta fillup korle nicher error ta dekhabe
    if (newStartTime < existingEndTime && newEndTime > existingStartTime) {
      throw new ApiError(httpStatus.CONFLICT, 'Room is already booked!');
    }
  }

  const result = await prisma.offeredCourseClassSchedule.create({
    data,
    include: {
      semesterRegistration: true,
      offeredCourseSection: true,
      room: true,
      faculty: true,
    },
  });
  return result;
};

export const OfferedCourseClassScheduleService = {
  insertIntoDB,
};
