import React, {
  useEffect,
  useState,
} from "react";
import api from "../../config/apiClient";

export default function BatchCompleted() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] =
    useState(true);

  const user =
    JSON.parse(
      localStorage.getItem("sarnUser")
    ) || {};

  useEffect(() => {
    loadCompleted();
  }, []);

  async function loadCompleted() {
    try {
      const res = await api.get(
        "/user/batch/completed",
        {
          params: {
            userId: user.userId,
          },
        }
      );
      console.log("COMPLETED API:", res.data);

      if (res.data.ok) {
        setRows(res.data.rows || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
  <div
    style={{
      marginLeft: "160px",
      padding: "20px",
      width: "calc(100% - 220px)",
      boxSizing: "border-box",
      minHeight: "100vh",
    }}
  >
      <h2>
        Completed Batch Records
      </h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table
          border="1"
          width="100%"
          cellPadding="8"
        >
          <thead>
            <tr
              style={{
                background: "#f1f5f9",
              }}
            >
              <th>Sheet</th>

              <th>New Repository</th>

              <th>Chemical Name</th>

              <th>Manufacturer</th>

              <th>Site Name</th>

              <th>Date Verified</th>

              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {rows.map(row => (
              <tr
                key={row.recordId}
              >
                <td>{row.sheet}</td>

                <td>
                  {row.newRepository}
                </td>

                <td>
                  {row.chemicalName}
                </td>

                <td>
                  {
                    row.manufacturerName
                  }
                </td>

                <td>
                  {row.siteName}
                </td>

                <td>
                  {row.verifiedDate}
                </td>

                <td>
                  <span
                    style={{
                      color:
                        "#16a34a",
                      fontWeight: 600,
                    }}
                  >
                    Completed
                  </span>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    textAlign:
                      "center",
                  }}
                >
                  No completed
                  records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}   