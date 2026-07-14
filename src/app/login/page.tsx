import { Lock } from "lucide-react";
import { unlockAction } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params.error === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-50">
      <form
        action={unlockAction}
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl"
      >
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-400 text-zinc-950">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-50">Atlas</h1>
            <p className="text-xs text-zinc-500">Inspiration OS · 私人空間</p>
          </div>
        </div>

        <label className="block text-sm text-zinc-400" htmlFor="password">
          密碼
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="輸入密碼"
          className="mt-2 h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-50 outline-none transition focus:border-sky-400"
        />

        {error ? (
          <p className="mt-3 text-sm text-red-400">密碼唔啱,再試一次。</p>
        ) : null}

        <button
          type="submit"
          className="mt-5 flex h-11 w-full items-center justify-center rounded-lg bg-sky-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300"
        >
          登入
        </button>

        <p className="mt-4 text-center text-xs text-zinc-600">
          登入一次,30 日內唔使再入密碼
        </p>
      </form>
    </main>
  );
}
