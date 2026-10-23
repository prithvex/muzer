"use client";
import { signIn , signOut, useSession} from "next-auth/react";

export function Appbar() {

  // check the user login or not --> using the react hook 
  // known as the "useSession()"

  const session = useSession();


  return (
    <div>
      <div className="flex justify-between">
        <div>MUZI</div>
        <div className="button-container">
          {session.data?.user &&  <button className="signin-btn" onClick={() => signOut()}>
            Log Out
          </button>}
          {!session.data?.user && <button className="signin-btn" onClick={() => signIn()}>
            Sign In
          </button>}
        </div>
      </div>
    </div>
  );
}
