const PROCTOR_KEY = 'nc.proctor';
const STUDENT_KEY = 'nc.student';

export interface ProctorAuth {
  token: string;
  name: string;
}
export interface StudentAuth {
  token: string;
  sessionId: string;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — app keeps working for this tab */
  }
}

let proctorMem: ProctorAuth | null = null;
let studentMem: StudentAuth | null = null;

export const auth = {
  proctor(): ProctorAuth | null {
    return proctorMem ?? (proctorMem = read<ProctorAuth>(PROCTOR_KEY));
  },
  setProctor(a: ProctorAuth | null) {
    proctorMem = a;
    write(PROCTOR_KEY, a);
  },
  student(): StudentAuth | null {
    return studentMem ?? (studentMem = read<StudentAuth>(STUDENT_KEY));
  },
  setStudent(a: StudentAuth | null) {
    studentMem = a;
    write(STUDENT_KEY, a);
  },
};
