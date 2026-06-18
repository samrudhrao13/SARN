import React, {
  useEffect,
  useState,
} from "react";
import api from "../../config/apiClient";

export default function BatchCompleted() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] =
    useState(true);
    const [summary, setSummary] =
  useState({
    completedToday: 0,
    completedMonth: 0,
    pendingAssigned: 0,
    totalCompleted: 0,
  });
const [fromDate, setFromDate] =
  useState("");

const [toDate, setToDate] =
  useState("");

const [total, setTotal] =
  useState(0);

const [page, setPage] =
  useState(1);

const pageSize = 100;


  const user =
    JSON.parse(
      localStorage.getItem("sarnUser")
    ) || {};

    useEffect(() => {
  loadCompleted();
}, [page]);

  async function loadCompleted() {
    try {
      const res = await api.get(
        "/user/batch/completed",
        {
          params: {
            userId: user.userId,
            fromDate,
            toDate,
            page,
            pageSize,
            },
        }
      );
      console.log("COMPLETED API:", res.data);

      if (res.data.ok) {
  setRows(res.data.rows || []);

  setSummary(
    res.data.summary || {}
  );

  setTotal(
    res.data.pagination?.total || 0
  );
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

<div
  style={{
    display: "flex",
    gap: 20,
    marginTop: 15,
    marginBottom: 20,
  }}
>
  <div
    style={{
      padding: 15,
      background: "#dcfce7",
      borderRadius: 8,
      minWidth: 180,
    }}
  >
    <strong>
      Completed Today
    </strong>
    <br />
    {summary.completedToday}
  </div>

  <div
    style={{
      padding: 15,
      background: "#dbeafe",
      borderRadius: 8,
      minWidth: 180,
    }}
  >
    <strong>
      Completed This Month
    </strong>
    <br />
    {summary.completedMonth}
  </div>

  <div
    style={{
      padding: 15,
      background: "#fef3c7",
      borderRadius: 8,
      minWidth: 180,
    }}
  >
    <strong>
      Pending Assigned
    </strong>
    <br />
    {summary.pendingAssigned}
  </div>

  <div
    style={{
      padding: 15,
      background: "#f3f4f6",
      borderRadius: 8,
      minWidth: 180,
    }}
  >
    <strong>
      Total Completed
    </strong>
    <br />
    {summary.totalCompleted}
  </div>
</div>
<div
  style={{
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 20,
  }}
>
  <label>From</label>

  <input
    type="date"
    value={fromDate}
    onChange={e =>
      setFromDate(
        e.target.value
      )
    }
  />

  <label>To</label>

  <input
    type="date"
    value={toDate}
    onChange={e =>
      setToDate(
        e.target.value
      )
    }
  />

  <button
    onClick={() => {
      setPage(1);
      loadCompleted();
    }}
  >
    Search
  </button>

  <button
    onClick={() => {
      setFromDate("");
      setToDate("");
      setPage(1);
      loadCompleted();
    }}
  >
    Clear
  </button>
</div>

<div
  style={{
    marginBottom: 15,
    fontWeight: 600,
  }}
>
  Records Found: {total}
</div>

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
      <div
  style={{
    marginTop: 20,
    display: "flex",
    justifyContent: "center",
    gap: 10,
  }}
>
  <button
    disabled={page === 1}
    onClick={() =>
      setPage(page - 1)
    }
  >
    Previous
  </button>

  <span>
    Page {page} of{" "}
    {Math.ceil(
      total / pageSize
    )}
  </span>

  <button
    disabled={
      page >=
      Math.ceil(
        total / pageSize
      )
    }
    onClick={() =>
      setPage(page + 1)
    }
  >
    Next
  </button>
</div>
    </div>
  );
}   