import { useEffect, useMemo, useState } from "react";
import "./styles.css";

type Role = "AMT_HEAD" | "CHIEF_INSTRUCTOR" | "INSTRUCTOR" | "OBSERVER" | "MAINTENANCE";

type User = { id: string; name: string; email: string; role: Role; departmentId?: string | null };

type Department = { id: string; name: string; chiefInstructorName?: string | null };

type Instructor = { id: string; name: string; email: string; departmentId?: string | null };

type Student = { id: string; name: string; departmentId: string };

type ClassItem = { id: string; name: string; departmentId: string };

type Task = { id: string; title: string; deadline: string; status: string; department: Department; owner: User; createdBy: User };

type CurriculumUpdate = { id: string; title: string; version: string; status: string; department: Department };

type MaintenanceReport = { id: string; title: string; status: string; createdAt: string; reporter: User };

type NotificationItem = { id: string; title: string; body: string };

type ChiefInstructor = { id: string; name: string; email: string; departmentId?: string | null; departmentName?: string | null };

type SystemUser = { id: string; name: string; email: string; role: Role; departmentId?: string | null };

const tabs = ["overview", "tasks", "curriculum", "departments", "maintenance", "notifications"] as const;

type Tab = (typeof tabs)[number];

const statusClass = (status: string) => {
  if (status === "OVERDUE") return "status-overdue";
  if (status === "APPROACHING") return "status-approaching";
  if (status === "ON_TRACK") return "status-ontrack";
  return "status-completed";
};

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [me, setMe] = useState<User | null>(null);
  const [hasUsers, setHasUsers] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [chiefs, setChiefs] = useState<ChiefInstructor[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [curriculum, setCurriculum] = useState<CurriculumUpdate[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceReport[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [setupForm, setSetupForm] = useState({ name: "", email: "", password: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", deadline: "", departmentId: "", ownerId: "" });
  const [currForm, setCurrForm] = useState({ title: "", summary: "", version: "", departmentId: "" });
  const [chiefForm, setChiefForm] = useState({ name: "", email: "", password: "", departmentId: "" });
  const [instructorForm, setInstructorForm] = useState({ name: "", email: "", password: "", departmentId: "" });
  const [studentForm, setStudentForm] = useState({ name: "", departmentId: "" });
  const [classForm, setClassForm] = useState({ name: "", departmentId: "" });
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "MAINTENANCE", departmentId: "" });
  const [deptForm, setDeptForm] = useState({ name: "" });
  const [maintForm, setMaintForm] = useState({ title: "", details: "" });

  const safeGet = async (url: string) => {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    return res.json();
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const statusRes = await fetch("/api/auth/status", { credentials: "include" });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setHasUsers(statusData.hasUsers);
      }
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (!meRes.ok) {
        setMe(null);
        setLoading(false);
        return;
      }
      const meData = await meRes.json();
      setMe(meData.user);

      const [deptData, taskData, currData, notifData, instrData, studData, classData, chiefData, userData] = await Promise.all([
        safeGet("/api/departments"),
        safeGet("/api/tasks"),
        safeGet("/api/curriculum-updates"),
        safeGet("/api/notifications"),
        safeGet("/api/instructors"),
        safeGet("/api/students"),
        safeGet("/api/classes"),
        safeGet("/api/chief-instructors"),
        safeGet("/api/users")
      ]);

      if (deptData) setDepartments(deptData.items);
      if (taskData) setTasks(taskData.items);
      if (currData) setCurriculum(currData.items);
      if (notifData) setNotifications(notifData.items);
      if (instrData) setInstructors(instrData.items);
      if (studData) setStudents(studData.items);
      if (classData) setClasses(classData.items);
      if (chiefData) setChiefs(chiefData.items);
      if (userData) setSystemUsers(userData.items);

      const maintData = await safeGet("/api/maintenance-reports");
      if (maintData) setMaintenance(maintData.items);
    } catch {
      setError("Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!me) return;
    const source = new EventSource("/api/notifications/stream");
    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as NotificationItem;
      if (data.id === "connected") return;
      setNotifications((prev) => [data, ...prev]);
      if (Notification.permission === "granted") {
        new Notification(data.title, { body: data.body });
      }
    };
    return () => source.close();
  }, [me]);

  const canManage = useMemo(() => me?.role === "AMT_HEAD", [me]);
  const isChief = useMemo(() => me?.role === "CHIEF_INSTRUCTOR", [me]);
  const isMaintenance = useMemo(() => me?.role === "MAINTENANCE", [me]);
  const deptId = me?.departmentId || "";
  const canCreateTask = canManage || isChief;

  const postJson = async (url: string, body: unknown, method = "POST") => {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("Request failed");
  };

  const login = async () => {
    try {
      await postJson("/api/auth/login", loginForm);
      loadAll();
    } catch {
      setError("Invalid credentials.");
    }
  };

  const setup = async () => {
    try {
      await postJson("/api/auth/setup", setupForm);
      loadAll();
    } catch {
      setError("Setup failed.");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setMe(null);
  };

  const createTask = async () => {
    try {
      await postJson("/api/tasks", taskForm);
      setTaskForm({ title: "", description: "", deadline: "", departmentId: "", ownerId: "" });
      loadAll();
    } catch {
      setError("Unable to create task.");
    }
  };

  const createCurriculum = async () => {
    try {
      await postJson("/api/curriculum-updates", currForm);
      setCurrForm({ title: "", summary: "", version: "", departmentId: "" });
      loadAll();
    } catch {
      setError("Unable to submit curriculum update.");
    }
  };

  const approveCurriculum = async (id: string, action: "approve" | "reject") => {
    try {
      await postJson(`/api/curriculum-updates/${id}/approve`, { action }, "PATCH");
      loadAll();
    } catch {
      setError("Unable to update curriculum status.");
    }
  };

  const createChiefInstructor = async () => {
    try {
      await postJson("/api/chief-instructors", chiefForm);
      setChiefForm({ name: "", email: "", password: "", departmentId: "" });
      loadAll();
    } catch {
      setError("Unable to add Chief Instructor.");
    }
  };

  const removeChiefInstructor = async (id: string) => {
    try {
      await fetch(`/api/chief-instructors/${id}`, { method: "DELETE", credentials: "include" });
      loadAll();
    } catch {
      setError("Unable to remove Chief Instructor.");
    }
  };

  const createInstructor = async () => {
    try {
      await postJson("/api/instructors", instructorForm);
      setInstructorForm({ name: "", email: "", password: "", departmentId: "" });
      loadAll();
    } catch {
      setError("Unable to add instructor.");
    }
  };

  const createStudent = async () => {
    try {
      await postJson("/api/students", studentForm);
      setStudentForm({ name: "", departmentId: "" });
      loadAll();
    } catch {
      setError("Unable to add student.");
    }
  };

  const createClass = async () => {
    try {
      await postJson("/api/classes", classForm);
      setClassForm({ name: "", departmentId: "" });
      loadAll();
    } catch {
      setError("Unable to add class.");
    }
  };

  const createSystemUser = async () => {
    try {
      await postJson("/api/users", userForm);
      setUserForm({ name: "", email: "", password: "", role: "MAINTENANCE", departmentId: "" });
      loadAll();
    } catch {
      setError("Unable to add system user.");
    }
  };

  const createDepartment = async () => {
    try {
      await postJson("/api/departments", deptForm);
      setDeptForm({ name: "" });
      loadAll();
    } catch {
      setError("Unable to create department.");
    }
  };

  const submitMaintenance = async () => {
    try {
      await postJson("/api/maintenance-reports", maintForm);
      setMaintForm({ title: "", details: "" });
      loadAll();
    } catch {
      setError("Unable to submit maintenance report.");
    }
  };
  if (loading) return <div className="center">Loading...</div>;

  if (!me) {
    return (
      <div className="center">
        <div className="card auth-card">
          <h2>Manage X Access</h2>
          {error && <div className="error">{error}</div>}
          {!hasUsers ? (
            <div className="form">
              <input placeholder="Full name" value={setupForm.name} onChange={(e) => setSetupForm({ ...setupForm, name: e.target.value })} />
              <input placeholder="Email" value={setupForm.email} onChange={(e) => setSetupForm({ ...setupForm, email: e.target.value })} />
              <input type="password" placeholder="Password" value={setupForm.password} onChange={(e) => setSetupForm({ ...setupForm, password: e.target.value })} />
              <button className="primary" onClick={setup}>Create AMT Head</button>
            </div>
          ) : (
            <div className="form">
              <input placeholder="Email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
              <input type="password" placeholder="Password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
              <button className="primary" onClick={login}>Sign In</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo">MX</div>
          <div>
            <div className="brand-title">Manage X</div>
            <div className="brand-sub">Institutional Command Center</div>
          </div>
        </div>
        <div className="top-actions">
          <button className="ghost" onClick={() => Notification.requestPermission()}>Enable Desktop Alerts</button>
          <div>
            <div className="profile-name">{me.name}</div>
            <div className="profile-role">{me.role}</div>
          </div>
          <button className="ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      <aside className="sidebar">
        <div className="label">Navigation</div>
        <div className="nav">
          {tabs.map((item) => {
            if (item === "maintenance" && !isMaintenance && !canManage) return null;
            if (item === "departments" && !canManage && !isChief) return null;
            return (
              <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            );
          })}
        </div>
        {error && <div className="error">{error}</div>}
      </aside>

      <main className="content">
        {tab === "overview" && (
          <div className="grid">
            <div className="card">
              <h3>Leadership Snapshot</h3>
              <div className="stack">
                <div>Departments: {departments.length}</div>
                <div>Active Tasks: {tasks.length}</div>
                <div>Curriculum Updates: {curriculum.length}</div>
                <div>Open Maintenance Reports: {maintenance.filter((m) => m.status !== "Closed").length}</div>
              </div>
              {canManage && (
                <div style={{ marginTop: 12 }}>
                  <strong>Chief Instructor Activity</strong>
                  <div className="stack">
                    {chiefs.map((chief) => (
                      <div key={chief.id} className="row">
                        <span>{chief.name}</span>
                        <span className="muted">{chief.departmentName || "Unassigned"}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    Tasks created by Chiefs: {tasks.filter((task) => task.createdBy?.role === "CHIEF_INSTRUCTOR").length}
                  </div>
                </div>
              )}
            </div>
            <div className="card">
              <h3>Notifications</h3>
              {notifications.slice(0, 6).map((note) => (
                <div key={note.id} className="list-item">
                  <strong>{note.title}</strong>
                  <div className="muted">{note.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "tasks" && (
          <div className="grid">
            {canCreateTask && (
              <div className="card">
                <h3>Create Task</h3>
                <div className="form">
                  <input placeholder="Title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                  <textarea placeholder="Description" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
                  <input type="date" value={taskForm.deadline} onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })} />
                  <select value={taskForm.departmentId} onChange={(e) => setTaskForm({ ...taskForm, departmentId: e.target.value })}>
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <select value={taskForm.ownerId} onChange={(e) => setTaskForm({ ...taskForm, ownerId: e.target.value })}>
                    <option value="">Assign to Instructor</option>
                    {departments.map((dept) => (
                      <optgroup key={dept.id} label={dept.name}>
                        {instructors.filter((inst) => inst.departmentId === dept.id).map((inst) => (
                          <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button className="primary" onClick={createTask}>Create Task</button>
                </div>
              </div>
            )}
            <div className="card">
              <h3>Task Tracker</h3>
              {tasks.map((task) => (
                <div key={task.id} className="list-item">
                  <div className="row">
                    <strong>{task.title}</strong>
                    <span className={`status-pill ${statusClass(task.status)}`}>{task.status.replace("_", " ")}</span>
                  </div>
                  <div className="muted">{task.department.name} • {task.owner.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "curriculum" && (
          <div className="grid">
            <div className="card">
              <h3>Submit Curriculum Update</h3>
              <div className="form">
                <input placeholder="Title" value={currForm.title} onChange={(e) => setCurrForm({ ...currForm, title: e.target.value })} />
                <input placeholder="Version" value={currForm.version} onChange={(e) => setCurrForm({ ...currForm, version: e.target.value })} />
                <textarea placeholder="Summary" value={currForm.summary} onChange={(e) => setCurrForm({ ...currForm, summary: e.target.value })} />
                <select value={currForm.departmentId} onChange={(e) => setCurrForm({ ...currForm, departmentId: e.target.value })}>
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                <button className="primary" onClick={createCurriculum}>Submit Update</button>
              </div>
            </div>
            <div className="card">
              <h3>Submitted Updates</h3>
              {curriculum.map((item) => (
                <div key={item.id} className="list-item">
                  <strong>{item.title}</strong>
                  <div className="muted">{item.department.name} • {item.version} • {item.status}</div>
                  {canManage && item.status === "SUBMITTED" && (
                    <div className="row" style={{ marginTop: 8 }}>
                      <button className="primary" onClick={() => approveCurriculum(item.id, "approve")}>Approve</button>
                      <button className="ghost" onClick={() => approveCurriculum(item.id, "reject")}>Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "departments" && (
          <div className="grid">
            <div className="card">
              <h3>Department Overview</h3>
              {departments.map((dept) => (
                <div key={dept.id} className="list-item">
                  <strong>{dept.name}</strong>
                  <div className="muted">Chief Instructor: {dept.chiefInstructorName || "Unassigned"}</div>
                </div>
              ))}
            </div>
            {canManage && (
              <div className="card">
                <h3>Create Department</h3>
                <div className="form">
                  <input placeholder="Department name" value={deptForm.name} onChange={(e) => setDeptForm({ name: e.target.value })} />
                  <button className="primary" onClick={createDepartment}>Add Department</button>
                </div>
              </div>
            )}
            {canManage && (
              <div className="card">
                <h3>Manage Chief Instructors</h3>
                <div className="form">
                  <input placeholder="Name" value={chiefForm.name} onChange={(e) => setChiefForm({ ...chiefForm, name: e.target.value })} />
                  <input placeholder="Email" value={chiefForm.email} onChange={(e) => setChiefForm({ ...chiefForm, email: e.target.value })} />
                  <input placeholder="Temporary password" type="password" value={chiefForm.password} onChange={(e) => setChiefForm({ ...chiefForm, password: e.target.value })} />
                  <select value={chiefForm.departmentId} onChange={(e) => setChiefForm({ ...chiefForm, departmentId: e.target.value })}>
                    <option value="">Assign Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <button className="primary" onClick={createChiefInstructor}>Add Chief Instructor</button>
                </div>
                <div className="stack" style={{ marginTop: 8 }}>
                  {chiefs.map((chief) => (
                    <div key={chief.id} className="row">
                      <span>{chief.name}</span>
                      <button className="ghost" onClick={() => removeChiefInstructor(chief.id)}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {canManage && (
              <div className="card">
                <h3>System Users</h3>
                <div className="form">
                  <input placeholder="Name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
                  <input placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                  <input placeholder="Temporary password" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
                  <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                    <option value="MAINTENANCE">Maintenance Staff</option>
                    <option value="OBSERVER">Observer</option>
                    <option value="INSTRUCTOR">Instructor</option>
                  </select>
                  <select value={userForm.departmentId} onChange={(e) => setUserForm({ ...userForm, departmentId: e.target.value })}>
                    <option value="">Department (optional)</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <button className="primary" onClick={createSystemUser}>Add User</button>
                </div>
                <div className="stack" style={{ marginTop: 8 }}>
                  {systemUsers.map((user) => (
                    <div key={user.id} className="row">
                      <span>{user.name} • {user.role}</span>
                      <span className="muted">{user.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isChief && (
              <div className="card">
                <h3>Department Operations</h3>
                <div className="stack">
                  <div className="form">
                    <strong>Instructors</strong>
                    <input placeholder="Name" value={instructorForm.name} onChange={(e) => setInstructorForm({ ...instructorForm, name: e.target.value })} />
                    <input placeholder="Email" value={instructorForm.email} onChange={(e) => setInstructorForm({ ...instructorForm, email: e.target.value })} />
                    <input placeholder="Temporary password" type="password" value={instructorForm.password} onChange={(e) => setInstructorForm({ ...instructorForm, password: e.target.value })} />
                    <select value={instructorForm.departmentId} onChange={(e) => setInstructorForm({ ...instructorForm, departmentId: e.target.value })}>
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                    <button className="primary" onClick={createInstructor}>Add Instructor</button>
                  </div>
                  <div className="form">
                    <strong>Students</strong>
                    <input placeholder="Student name" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} />
                    <select value={studentForm.departmentId} onChange={(e) => setStudentForm({ ...studentForm, departmentId: e.target.value })}>
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                    <button className="primary" onClick={createStudent}>Add Student</button>
                  </div>
                  <div className="form">
                    <strong>Classes</strong>
                    <input placeholder="Class name" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} />
                    <select value={classForm.departmentId} onChange={(e) => setClassForm({ ...classForm, departmentId: e.target.value })}>
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                    <button className="primary" onClick={createClass}>Add Class</button>
                  </div>
                  <div className="stack">
                    {instructors.filter((inst) => inst.departmentId === deptId).map((inst) => (
                      <div key={inst.id} className="row"><span>{inst.name}</span><span className="muted">{inst.email}</span></div>
                    ))}
                    {students.filter((student) => student.departmentId === deptId).map((student) => (
                      <div key={student.id} className="row"><span>{student.name}</span></div>
                    ))}
                    {classes.filter((cls) => cls.departmentId === deptId).map((cls) => (
                      <div key={cls.id} className="row"><span>{cls.name}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {tab === "maintenance" && (
          <div className="grid">
            {isMaintenance && (
              <div className="card">
                <h3>System Maintenance Report</h3>
                <div className="form">
                  <input placeholder="Issue title" value={maintForm.title} onChange={(e) => setMaintForm({ ...maintForm, title: e.target.value })} />
                  <textarea placeholder="Details / logs" value={maintForm.details} onChange={(e) => setMaintForm({ ...maintForm, details: e.target.value })} />
                  <button className="primary" onClick={submitMaintenance}>Submit Report</button>
                </div>
              </div>
            )}
            <div className="card">
              <h3>Reported Issues</h3>
              {maintenance.map((report) => (
                <div key={report.id} className="list-item">
                  <strong>{report.title}</strong>
                  <div className="muted">{report.status} • {new Date(report.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "notifications" && (
          <div className="card">
            <h3>Notification Center</h3>
            {notifications.map((note) => (
              <div key={note.id} className="list-item">
                <strong>{note.title}</strong>
                <div className="muted">{note.body}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}