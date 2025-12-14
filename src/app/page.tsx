import { redirect } from 'next/navigation';

export default function Home() {
  console.log("Rendering Home Page - Version: FIX-v12");
  redirect('/login');
}
