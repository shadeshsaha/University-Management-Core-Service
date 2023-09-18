import { OfferedCourseClassSchedule } from '@prisma/client';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import prisma from '../../../shared/prisma';
import { hasTimeConflict } from '../../../shared/utils';

const checkRoomAvailable = async (data: OfferedCourseClassSchedule) => {
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

  if (hasTimeConflict(existingSlots, newSlot)) {
    throw new ApiError(httpStatus.CONFLICT, 'Room is already booked!');
  }
};

export const OfferedCourseClassScheduleUtils = {
  checkRoomAvailable,
};
