import { WeekDays } from '@prisma/client';

export const asyncForEach = async (array: any[], callback: any) => {
  if (!Array.isArray(array)) {
    throw new Error('Expected an array');
  }
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

export const hasTimeConflict = (
  existingSlots: {
    startTime: string;
    endTime: string;
    dayOfWeek: WeekDays;
  }[],
  newSlot: {
    startTime: string;
    endTime: string;
    dayOfWeek: WeekDays;
  }
) => {
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
      // throw new ApiError(httpStatus.CONFLICT, 'Room is already booked!');
      return true;
    }
  }
  return false;
};
