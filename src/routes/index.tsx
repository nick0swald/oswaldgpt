import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { StudentApp } from "@/components/student-app";
import { TeacherView } from "@/components/teacher-view";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [teacher, setTeacher] = useState(false);
  return (
    <AppShell onSecret={() => setTeacher(true)}>
      <StudentApp />
      {teacher ? <TeacherView onClose={() => setTeacher(false)} /> : null}
    </AppShell>
  );
}
