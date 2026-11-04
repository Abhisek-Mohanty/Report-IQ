/**
 * Report-IQ — Exact Ottimate.com Design Clone Interactive Scripts
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Top Announcement Bar Dismissal
  const announceCloseBtn = document.querySelector(".ott-announcement-close");
  const announceBar = document.querySelector(".ott-announcement-bar");
  if (announceCloseBtn && announceBar) {
    announceCloseBtn.addEventListener("click", () => {
      announceBar.style.display = "none";
    });
  }

  // 2. Navbar Scroll Effect
  const navbar = document.querySelector(".navbar-ottimate");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

  // 3. Capsule Pill Accordion (Screenshot 5)
  const capsuleItems = document.querySelectorAll(".ott-capsule-item");
  capsuleItems.forEach((item) => {
    const header = item.querySelector(".ott-capsule-header");
    if (header) {
      header.addEventListener("click", () => {
        const isActive = item.classList.contains("active");

        capsuleItems.forEach((other) => {
          if (other !== item) other.classList.remove("active");
        });

        if (isActive) {
          item.classList.remove("active");
        } else {
          item.classList.add("active");
        }
      });
    }
  });

  // 4. FAQ Accordion Toggle
  const faqCards = document.querySelectorAll(".ott-faq-card");
  faqCards.forEach((card) => {
    const header = card.querySelector(".ott-faq-header");
    if (header) {
      header.addEventListener("click", () => {
        const isActive = card.classList.contains("active");

        faqCards.forEach((other) => {
          if (other !== card) other.classList.remove("active");
        });

        if (isActive) {
          card.classList.remove("active");
        } else {
          card.classList.add("active");
        }
      });
    }
  });

  // 5. Interactive Live Simulator Dataset Switcher
  const sampleDatasets = {
    loans: {
      name: "Commercial_Loan_Portfolio_Q3.xlsx",
      records: "3,717 Rows • 7 Columns",
      kpiTotal: "$3,672,589,887",
      kpiAvg: "$988,052",
      kpiOutliers: "24 Outliers",
      kpiCorr: "r = +0.89 (High Positive)",
      rows: [
        { id: "LN-98214", colA: "$2,000,000", colB: "$1,952,197", colC: "Performing", status: "Active" },
        { id: "LN-98215", colA: "$1,500,000", colB: "$1,480,303", colC: "Performing", status: "Active" },
        { id: "LN-98216", colA: "$1,200,000", colB: "$1,182,307", colC: "Performing", status: "Active" },
        { id: "LN-98217", colA: "$800,000", colB: "$785,870", colC: "30-Days Past", status: "Review" },
        { id: "LN-98218", colA: "$700,000", colB: "$693,597", colC: "Performing", status: "Active" }
      ],
      headers: ["Loan Account #", "Disbursed Amount", "Principal Outstanding (POS)", "Risk Tier", "Status"]
    },
    saas: {
      name: "SaaS_MRR_Churn_Ledger_2026.csv",
      records: "12,450 Rows • 9 Columns",
      kpiTotal: "$8,420,110",
      kpiAvg: "$676.31",
      kpiOutliers: "18 Outliers",
      kpiCorr: "r = -0.74 (Strong Inverse)",
      rows: [
        { id: "ORG-1029", colA: "$14,500", colB: "$174,000", colC: "Enterprise", status: "Retained" },
        { id: "ORG-1030", colA: "$9,200", colB: "$110,400", colC: "Mid-Market", status: "Retained" },
        { id: "ORG-1031", colA: "$4,100", colB: "$49,200", colC: "Growth", status: "At-Risk" },
        { id: "ORG-1032", colA: "$1,250", colB: "$15,000", colC: "Starter", status: "Retained" },
        { id: "ORG-1033", colA: "$650", colB: "$7,800", colC: "Starter", status: "Churned" }
      ],
      headers: ["Customer ID", "Monthly Recurring (MRR)", "Annual Contract (ARR)", "Segment", "Retention"]
    },
    claims: {
      name: "Healthcare_Provider_Claims_Audit.xlsx",
      records: "28,910 Rows • 11 Columns",
      kpiTotal: "$19,842,500",
      kpiAvg: "$686.35",
      kpiOutliers: "42 Outliers",
      kpiCorr: "r = +0.94 (Near Linear)",
      rows: [
        { id: "CLM-4401", colA: "$8,450.00", colB: "$8,450.00", colC: "In-Network", status: "Approved" },
        { id: "CLM-4402", colA: "$5,120.00", colB: "$4,900.00", colC: "Variance Gap", status: "Review" },
        { id: "CLM-4403", colA: "$3,890.00", colB: "$3,890.00", colC: "In-Network", status: "Approved" },
        { id: "CLM-4404", colA: "$2,400.00", colB: "$2,400.00", colC: "In-Network", status: "Approved" },
        { id: "CLM-4405", colA: "$1,150.00", colB: "$1,150.00", colC: "Copay Gap", status: "Review" }
      ],
      headers: ["Claim ID", "Billed Amount", "Adjudicated Amount", "Coverage Type", "Audit Result"]
    }
  };

  const simBtns = document.querySelectorAll(".ott-sim-pill-btn");
  const simFileName = document.getElementById("sim-file-name");
  const simRecordCount = document.getElementById("sim-record-count");
  const simKpiTotal = document.getElementById("sim-kpi-total");
  const simKpiAvg = document.getElementById("sim-kpi-avg");
  const simKpiOutliers = document.getElementById("sim-kpi-outliers");
  const simKpiCorr = document.getElementById("sim-kpi-corr");
  const simTableHead = document.getElementById("sim-table-head");
  const simTableBody = document.getElementById("sim-table-body");

  function renderSimDataset(key) {
    const data = sampleDatasets[key];
    if (!data) return;

    if (simFileName) simFileName.innerText = data.name;
    if (simRecordCount) simRecordCount.innerText = data.records;
    if (simKpiTotal) simKpiTotal.innerText = data.kpiTotal;
    if (simKpiAvg) simKpiAvg.innerText = data.kpiAvg;
    if (simKpiOutliers) simKpiOutliers.innerText = data.kpiOutliers;
    if (simKpiCorr) simKpiCorr.innerText = data.kpiCorr;

    if (simTableHead) {
      simTableHead.innerHTML = `<tr>${data.headers
        .map((h) => `<th>${h}</th>`)
        .join("")}</tr>`;
    }

    if (simTableBody) {
      simTableBody.innerHTML = data.rows
        .map((row) => {
          const isWarning = row.status === "Review" || row.status === "At-Risk" || row.status === "Churned";
          const badgeStyle = isWarning
            ? "background: rgba(245, 158, 11, 0.2); color: #fbbf24;"
            : "background: rgba(45, 212, 191, 0.2); color: #2dd4bf;";
          return `
            <tr>
              <td><span style="font-family: monospace; color: #818cf8;">${row.id}</span></td>
              <td><strong>${row.colA}</strong></td>
              <td>${row.colB}</td>
              <td>${row.colC}</td>
              <td><span style="padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; ${badgeStyle}">${row.status}</span></td>
            </tr>
          `;
        })
        .join("");
    }
  }

  simBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      simBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const key = btn.getAttribute("data-dataset");
      renderSimDataset(key);
    });
  });

  // Initial Simulator render
  renderSimDataset("loans");

  // 6. 27-Format Category Filter Bar
  const formatFilterBtns = document.querySelectorAll(".ott-format-filter-btn");
  const formatCards = document.querySelectorAll(".ott-format-col-item");

  formatFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      formatFilterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const category = btn.getAttribute("data-filter");
      formatCards.forEach((card) => {
        if (category === "all" || card.getAttribute("data-category") === category) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  });

  // 7. Smooth Anchor Scrolling
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId && targetId !== "#") {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }
    });
  });
});
