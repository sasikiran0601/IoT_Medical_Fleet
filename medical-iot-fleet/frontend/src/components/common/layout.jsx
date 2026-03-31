import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import AlertBanner from "./AlertBanner";

export default function Layout() {
    return (
        <div className="flex h-screen overflow-hidden bg-bg-main">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <AlertBanner />
                <Navbar />
                <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_28%)] p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
