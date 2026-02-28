import React, { useEffect, useState } from "react";
import { getCookie } from "../utils/cookieHelper";

type User = { id: number; name: string; email: string };
import { API_BASE_URL } from "../../constants";

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");

      try {
        const token = getCookie("auth_token");
        const res = await fetch(`${API_BASE_URL}/users`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          // fallback to sample data if endpoint not reachable
          throw new Error("Failed to fetch users");
        }

        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.data || []);
      } catch (err: any) {
        setError(err.message || "Could not load users. Showing sample data.");
        // sample data fallback
        setUsers([
          { id: 1, name: "Admin User", email: "admin@example.com" },
          { id: 2, name: "John Doe", email: "john@example.com" },
        ]);
      }

      setLoading(false);
    };

    fetchUsers();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">User Master</h1>
      {loading && <p>Loading users...</p>}
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      <div className="overflow-x-auto bg-white rounded-xl shadow p-4">
        <table className="w-full text-sm table-auto">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2 px-3">ID</th>
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Email</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="py-2 px-3">{u.id}</td>
                <td className="py-2 px-3">{u.name}</td>
                <td className="py-2 px-3">{u.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersPage;
