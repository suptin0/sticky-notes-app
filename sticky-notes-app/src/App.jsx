import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

function App() {
  const [notes, setNotes] = useState([]);
  const [user, setUser] = useState(null); // เช็คว่ามีคนล็อกอินหรือยัง

  // 1. ระบบ Authentication (Login/Logout)
  useEffect(() => {
    // คอยดักฟังว่ามีใคร Login หรือ Logout
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(err => console.log(err));
  };

  const logout = () => {
    signOut(auth);
  };

  // 2. ดึงข้อมูลจาก Firestore แบบ Real-time (ทำงานเมื่อมี User Login)
  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }
    
    // ชี้ไปที่ Collection ชื่อ "notes"
    const notesRef = collection(db, 'notes');
    
    // onSnapshot คือการดึงข้อมูลแบบ Real-time ถ้าบนเน็ตเปลี่ยน หน้าเว็บเราเปลี่ยนตามทันที!
    const unsubscribe = onSnapshot(notesRef, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotes(notesData);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. ฟังก์ชัน: เพิ่มโน้ตใหม่ (เซฟลง Database)
  const addNote = async () => {
    const newNote = {
      text: '',
      color: 'bg-yellow-200',
      position: { 
        x: Math.floor(Math.random() * 100) + 50, 
        y: Math.floor(Math.random() * 100) + 50 
      },
      uid: user.uid, // เก็บว่าใครเป็นคนสร้าง
      createdAt: new Date()
    };
    await addDoc(collection(db, 'notes'), newNote);
  };

  // 4. ฟังก์ชัน: อัปเดตข้อมูล (เซฟลง Database)
  const updateNote = async (id, field, value) => {
    // อัปเดตหน้าเว็บเราให้เร็วก่อน (Optimistic Update)
    setNotes(notes.map(note => 
      note.id === id ? { ...note, [field]: value } : note
    ));
    
    // อัปเดตลง Database
    const noteRef = doc(db, 'notes', id);
    await updateDoc(noteRef, { [field]: value });
  };

  // 5. ฟังก์ชัน: ลบโน้ต (เซฟลง Database)
  const deleteNote = async (id) => {
    await deleteDoc(doc(db, 'notes', id));
  };

  // 6. ฟังก์ชันจัดการการลาก (อัปเกรดให้ลื่นขึ้น ไม่กินเน็ต)
  const handleDragStart = (e, noteClicked) => {
    // หาระยะห่างระหว่างเมาส์กับมุมของกระดาษ
    const offsetX = e.clientX - (noteClicked.position?.x || 50);
    const offsetY = e.clientY - (noteClicked.position?.y || 50);
    
    // สร้างตัวแปรเก็บพิกัดชั่วคราวขณะลาก
    let currentX = noteClicked.position?.x || 50;
    let currentY = noteClicked.position?.y || 50;

    const handleMouseMove = (moveEvent) => {
      currentX = moveEvent.clientX - offsetX;
      currentY = moveEvent.clientY - offsetY;
      
      // 1. อัปเดตแค่หน้าจอเราให้ลื่นๆ (ไม่ส่งเข้า Database)
      setNotes(prevNotes => prevNotes.map(note => 
        note.id === noteClicked.id ? { ...note, position: { x: currentX, y: currentY } } : note
      ));
    };

    const handleMouseUp = async () => {
      // เลิกติดตามเมาส์เมื่อปล่อยคลิก
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // 2. ส่งเข้า Database เฉพาะตอน "ปล่อยเมาส์" เท่านั้น!
      const noteRef = doc(db, 'notes', noteClicked.id);
      await updateDoc(noteRef, { position: { x: currentX, y: currentY } });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ถ้ายังไม่ Login ให้แสดงหน้า Login
  if (!user) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-bold text-amber-900 mb-8">My Sticky Notes 📌</h1>
        <button 
          onClick={loginWithGoogle}
          className="bg-white hover:bg-gray-50 text-gray-800 font-bold py-3 px-6 rounded shadow-md border border-gray-200 flex items-center gap-3 transition"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          เข้าสู่ระบบด้วย Google
        </button>
      </div>
    );
  }

  // หน้าตาแอป (ตอน Login แล้ว)
  return (
    <div className="min-h-screen bg-amber-50 p-8 font-sans">
      <div className="flex justify-between items-center mb-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-amber-900">My Sticky Notes 📌</h1>
          <span className="text-sm text-gray-500">สวัสดี, {user.displayName}</span>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={addNote}
            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg font-semibold shadow-md transition"
          >
            + เพิ่มโน้ตใหม่
          </button>
          <button 
            onClick={logout}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold transition"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
      
      <div className="relative w-full max-w-5xl mx-auto h-[600px] bg-yellow-900/10 rounded-xl border-4 border-yellow-900/20 shadow-inner overflow-hidden">
        {notes.map(note => (
          <div 
            key={note.id}
            className={`absolute w-64 h-64 shadow-xl flex flex-col ${note.color} transition-colors duration-300 rounded-sm`}
            style={{ left: note.position?.x || 50, top: note.position?.y || 50 }}
          >
            <div 
              className="w-full h-8 bg-black/10 cursor-grab active:cursor-grabbing flex justify-end items-center px-3 rounded-t-sm"
              onMouseDown={(e) => handleDragStart(e, note)}
            >
              <button 
                onClick={() => deleteNote(note.id)}
                className="text-black/30 hover:text-red-500 font-bold text-sm transition"
              >
                ✕
              </button>
            </div>
            <textarea 
              className="w-full h-full p-4 bg-transparent resize-none outline-none text-gray-800 font-medium"
              placeholder="พิมพ์ข้อความที่นี่..."
              value={note.text || ''}
              // เปลี่ยนจาก updateNote เป็นอัปเดตแค่หน้าจอเรา (Local)
              onChange={(e) => setNotes(notes.map(n => n.id === note.id ? { ...n, text: e.target.value } : n))}
              // ใช้ onBlur ส่งข้อมูลเข้า Database ตอนพิมพ์เสร็จแล้วคลิกที่อื่น
              onBlur={async (e) => {
                const noteRef = doc(db, 'notes', note.id);
                await updateDoc(noteRef, { text: e.target.value });
              }}
            ></textarea>
            <div className="flex gap-3 p-3 bg-black/5 justify-center mt-auto">
              {['bg-yellow-200', 'bg-pink-200', 'bg-blue-200', 'bg-green-200'].map(colorClass => (
                <button 
                  key={colorClass}
                  onClick={() => updateNote(note.id, 'color', colorClass)}
                  className={`w-6 h-6 rounded-full ${colorClass} shadow-sm border-2 ${
                    note.color === colorClass ? 'border-gray-500 scale-110' : 'border-white/50'
                  } hover:scale-110 transition`}
                ></button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;