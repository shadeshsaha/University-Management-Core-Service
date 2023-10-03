import { Course, StudentEnrolledCourse } from '@prisma/client';

const getGradeFromMarks = (marks: number) => {
  let result = {
    grade: '',
    point: 0,
  };

  // calculate grade
  if (marks >= 0 && marks <= 39) {
    result = {
      grade: 'F',
      point: 0,
    };
  } else if (marks >= 40 && marks <= 49) {
    result = {
      grade: 'D',
      point: 2.0,
    };
  } else if (marks >= 50 && marks <= 59) {
    result = {
      grade: 'C',
      point: 2.5,
    };
  } else if (marks >= 60 && marks <= 69) {
    result = {
      grade: 'B',
      point: 3.0,
    };
  } else if (marks >= 70 && marks <= 79) {
    result = {
      grade: 'A',
      point: 3.5,
    };
  } else if (marks >= 80 && marks <= 100) {
    result = {
      grade: 'A+',
      point: 4.0,
    };
  }

  return result;
};

// Using "grade" and "point" calculate final CGPA and Grade
const calcCGPAandGrade = (
  payload: (StudentEnrolledCourse & { course: Course })[]
) => {
  // console.log('Payload: ', payload);

  // jodi student er kono course complete na hoye thake, payload er length jodi 0 hoy then will apply below function
  if (payload.length === 0) {
    return {
      totalCompletedCredit: 0,
      cgpa: 0,
    };
  }

  let totalCredit = 0;
  let totalCGPA = 0;

  // payload er length 0 na hole, means payload a data thakle loop use kore data get korbo cz data array te ache.
  for (const grade of payload) {
    // console.log('Grade: ', grade); // found a object of data
    totalCGPA += grade.point || 0;
    totalCredit += grade.course.credits || 0;
  }
  // console.log('totalCGPA: ', totalCGPA);
  // console.log('totalCredit: ', totalCredit);

  const avgCGPA = Number((totalCGPA / payload.length).toFixed(2));

  // Total avgCGPA and total joto credit nea hoyeche seta find kora holo
  // console.log('avgCGPA: ', avgCGPA);
  // console.log('totalCredit: ', totalCredit);

  return {
    totalCompletedCredit: totalCredit,
    cgpa: avgCGPA,
  };
};

export const StudentEnrolledCourseMarkUtils = {
  getGradeFromMarks,
  calcCGPAandGrade,
};
