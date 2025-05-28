"use client";
import { signOut } from "next-auth/react";
import { Button } from "react-bootstrap";

const LogoutButton = () => {
  return (
    <Button variant="secondary" onClick={() => signOut({ redirect: true, callbackUrl: "/auth/login" })}>
      Sair
    </Button>
  );
};

export default LogoutButton;
