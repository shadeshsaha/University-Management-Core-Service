const getAvailableCourses = (
  studentCompletedCourses: any,
  studentCurrentlyTakenCourses: any,
  offeredCourses: any
) => {
  // console.log('studentCompletedCourses: ', studentCompletedCourses);
  // console.log('studentCurrentlyTakenCourses: ', studentCurrentlyTakenCourses);
  // console.log('offeredCourses: ', offeredCourses);

  // 1. student er complete howa course er id get kora
  const completedCoursesId = studentCompletedCourses.map(
    (course: any) => course.courseId
  );
  //   console.log('completedCoursesId: ', completedCoursesId);

  // 2. Show available courses (this will remove completed courses)
  const availableCoursesList = offeredCourses
    // removed completed courses
    .filter(
      (offeredCourse: any) =>
        !completedCoursesId.includes(offeredCourse.courseId)
    )
    .filter((course: any) => {
      const preRequisites = course.course.preRequisite;
      // console.log('preRequisites: ', preRequisites);

      // check pre-requisite course sesh kore ashchi kina check kora
      if (preRequisites.length === 0) {
        return true;
      } else {
        // finding pre-requisite ids
        const preRequisitieIds = preRequisites.map(
          (preRequisite: any) => preRequisite.preRequisiteId
        );
        // console.log('preRequisitieIds: ', preRequisitieIds);

        // completed courses er moddhe pre-requisite course check kora
        return preRequisitieIds.every((id: string) =>
          completedCoursesId.includes(id)
        );
      }
    })
    .map((course: any) => {
      // studentCurrentlyTakenCourses check hocche using map
      // check already taken courses
      const isAlreadyTakenCourse = studentCurrentlyTakenCourses.find(
        (takenCourse: any) => takenCourse.offeredCourseId === course.id
      );

      // taken course er data pawa gele kon section er jonno course/data niyeche seta show kora. check hobe kon section er jonno course niyeche, shei section ta bad diye baki section er jonno dekhano hobe
      if (isAlreadyTakenCourse) {
        course.offeredCourseSections.map((section: any) => {
          if (section.id === isAlreadyTakenCourse.offeredCourseSectionId) {
            section.isTaken = true;
          } else {
            section.isTaken = false;
          }
        });
        return {
          ...course,
          isTaken: true,
        };
      } else {
        course.offeredCourseSections.map((section: any) => {
          section.isTaken = false;
        });
        return {
          ...course,
          isTaken: false,
        };
      }
    });

  // console.log('availableCoursesList: ', availableCoursesList);
  return availableCoursesList;
};

export const SemesterRegistrationUtils = {
  getAvailableCourses,
};
