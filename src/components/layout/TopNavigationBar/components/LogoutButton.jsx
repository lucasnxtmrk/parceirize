"use client";
import { signOut } from "next-auth/react";
import { Button } from "react-bootstrap";

const LogoutButton = () => {

  return (
    <Button
      onClick={() => signOut({ callbackUrl: "/auth/login-cliente" })}
    >
      Sair
    </Button>
  );
};

export default LogoutButton;
