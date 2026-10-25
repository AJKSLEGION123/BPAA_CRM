import Link from "next/link";

export const metadata = { title: "Нет такой страницы" };

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="text-center">
        <h1 className="text-[24px] font-bold">Такой страницы в демо нет</h1>
        <Link href="/" className="btn btn-primary mt-4">На «Сегодня»</Link>
      </div>
    </main>
  );
}
