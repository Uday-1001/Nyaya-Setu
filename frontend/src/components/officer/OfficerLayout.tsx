import { Outlet } from "react-router-dom";
import { OfficerPageShell } from "./OfficerPageShell";
import { OfficerNavbar } from "./OfficerNavbar";

export const OfficerLayout = () => (
  <OfficerPageShell>
    <OfficerNavbar />
    <main className="flex-1 w-full min-h-0 overflow-y-auto overscroll-contain">
      <div className="w-full px-3 py-6 sm:px-4 md:px-6 lg:px-8 md:py-7">
        <Outlet />
      </div>
    </main>
  </OfficerPageShell>
);

export default OfficerLayout;
