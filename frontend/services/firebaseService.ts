import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  User
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/models/types";

export const firebaseService = {
  async register(email: string, password: string, name: string): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userProfile: Omit<UserProfile, 'uid'> = {
      name,
      email,
      role: 'student',
      semester: null,
      cgpa: null,
      githubUsername: "",
      leetcodeUsername: "",
      grade: "N/A",
      score: 0,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", user.uid), userProfile);
    return user;
  },

  async login(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { uid, ...docSnap.data() } as UserProfile;
    } else {
      return null;
    }
  },

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, data);
  },

  async getAllStudents(): Promise<UserProfile[]> {
    const q = query(collection(db, "users"), where("role", "==", "student"));
    const querySnapshot = await getDocs(q);
    const students: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      students.push({ uid: doc.id, ...doc.data() } as UserProfile);
    });
    return students;
  }
};
