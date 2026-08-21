# BizLedger: Stationery & General Store Manager

## Project Overview

BizLedger is a client-side web application designed to help manage inventory, sales, and reports for both a stationery shop and a general store. It provides an intuitive interface for adding products, recording sales, tracking stock levels, and visualizing key business metrics. The application is built entirely on the frontend, utilizing browser's `localStorage` for data persistence.

## Key Features

*   **Multi-Shop Management:** Supports managing inventory and sales for two distinct shop types:
    *   **Stationery Shop:** Ideal for quantity-based items (e.g., pens, registers).
    *   **General Store:** Handles both quantity-based and weight-based (KG) items (e.g., groceries).
*   **Inventory Management:**
    *   Add and update product details (name, SKU, category, prices, stock, unit type).
    *   Track current stock levels with precision (including decimal values for KG items).
    *   Low stock threshold alerts to prompt timely restocking.
    *   Prevents changing a product's unit type after creation to maintain data integrity.
*   **Point of Sale (POS):**
    *   Search and add products to a sales cart.
    *   Real-time stock validation to prevent selling out-of-stock items.
    *   Handles both unit-based and weight-based (KG) sales with appropriate quantity inputs.
    *   Records sales with customer details, total amount, and payment mode.
*   **Dashboard & Reporting:**
    *   **Shop-Specific Dashboards:** View sales performance, total profit, stock value, and low stock items tailored to the selected shop.
    *   **Combined Dashboard:** Get a global overview of consolidated revenue, profit, and total active SKUs across both shops.
    *   Visualizations using `recharts` for sales performance over time and sales by category (displaying actual quantities sold).
*   **Data Persistence:** All product and sales data is automatically saved to and loaded from the browser's `localStorage`, ensuring data remains available across browser sessions.

## Technology Stack

*   **Frontend Framework:** React (using functional components and Hooks)
*   **Language:** TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS (loaded via CDN for simplicity)
*   **Icons:** `lucide-react`
*   **Charting Library:** `recharts`

## Setup Instructions

To get the BizLedger application running on your local machine:

### Prerequisites

*   **Node.js:** Ensure you have Node.js (which includes `npm`) installed. You can download it from [nodejs.org](https://nodejs.org/).

### Steps

1.  **Clone the Repository:**
    If you haven't already, obtain the project files. (Assuming you have them in `D:\Ahmed Stationers\`).

2.  **Navigate to Project Directory:**
    Open your terminal or command prompt and change to the project's root directory:
    ```bash
    cd "D:\Ahmed Stationers"
    ```

3.  **Install Dependencies:**
    Install all required Node.js packages:
    ```bash
    npm install
    # or if you prefer yarn:
    # yarn install
    ```

4.  **Run the Development Server:**
    Start the Vite development server:
    ```bash
    npm run dev
    # or if you prefer yarn:
    # yarn dev
    ```
    The application will typically be available at `http://localhost:5173` (or a similar port). Your terminal will display the exact URL.

5.  **Open in Browser:**
    Open your web browser and navigate to the URL provided by the development server.

## Accessing on Mobile Devices (Local Network)

To access the application on your mobile phone while running the local development server:

1.  **Same Wi-Fi Network:** Ensure both your computer and your mobile phone are connected to the **same Wi-Fi network**.

2.  **Find Computer's IP Address:**
    *   **Windows:** Open Command Prompt and type `ipconfig`. Look for "Wireless LAN adapter Wi-Fi" and note the "IPv4 Address" (e.g., `192.168.1.10`).
    *   **(Note: The `dev` script has been updated to include `--host` for network access.)**

3.  **Start Development Server:**
    Run `npm run dev` in your project directory. The terminal will now display a "Network" URL, which will be `http://<your-computer-ip-address>:<port>` (e.g., `http://192.168.1.10:5173`).

4.  **Access from Phone:**
    Open your mobile phone's web browser and enter the "Network" URL from your terminal.

## Deployment for Public Access

To make your application accessible from anywhere (without needing your computer to run the development server), you need to deploy it to a web hosting service.

1.  **Build for Production:**
    Generate optimized static files for deployment:
    ```bash
    npm run build
    # or if you prefer yarn:
    # yarn build
    ```
    This will create a `dist` folder in your project root containing all the deployable assets.

2.  **Choose a Hosting Service:**
    For static web applications, **Vercel** or **Netlify** are highly recommended due to their free tiers, ease of use, and excellent developer experience.

    *   **Vercel (Recommended):**
        1.  Push your code to a Git repository (GitHub, GitLab, Bitbucket).
        2.  Sign up at [vercel.com](https://vercel.com/) and connect your Git repository.
        3.  Vercel will automatically detect your Vite project, use `npm run build` as the build command, and deploy the `dist` directory.
        4.  Every push to your main branch will trigger an automatic redeployment.

    *   **Netlify:** Offers a similar seamless deployment experience from Git repositories.

## Project Structure Highlights

*   **`App.tsx`:** The main application component, managing global state (products, sales) and routing to different views.
*   **`components/`:** Contains all the UI components, such as `Dashboard.tsx`, `Inventory.tsx`, `Sales.tsx`, `Reports.tsx`, and `CombinedDashboard.tsx`.
*   **`types.ts`:** Defines TypeScript interfaces for data structures like `Product`, `Sale`, `SaleItem`, `ShopType`, `UnitType`, etc., ensuring type safety throughout the application.
*   **`constants.tsx`:** Stores initial product data and categories.
*   **`vite.config.ts`:** Vite build configuration.

## Architectural Decisions

*   **Client-Side Only:** The application runs entirely in the browser, without a dedicated backend server or database.
*   **`localStorage` for Persistence:** All application data is stored directly in the browser's `localStorage`, providing persistence across sessions for a single user.
*   **React Hooks for State Management:** `useState` and `useEffect` hooks are extensively used for managing component and global application state.
*   **"Prop Drilling":** State and update functions are passed down to child components via props.

## Important Note on Data

The application uses `localStorage` for data storage. This means:
*   Data is specific to the browser and device it's being used on.
*   Clearing browser data will delete all application data.
*   It is not designed for multi-user access or data sharing across different devices.

For a production environment requiring shared data, user authentication, or more complex data operations, a dedicated backend with a database would be necessary.