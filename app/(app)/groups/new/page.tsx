import { NewGroupForm } from "./new-group-form";

export default function NewGroupPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New group</h1>
        <p className="mt-1 text-sm text-orbit-muted">
          Pick the mode that matches how this crew handles money. You can't change it later.
        </p>
      </header>
      <NewGroupForm />
    </div>
  );
}
