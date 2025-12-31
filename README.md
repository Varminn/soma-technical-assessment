## Soma Capital Technical Assessment

This is a technical assessment as part of the interview process for Soma Capital.

> [!IMPORTANT]  
> You will need a Pexels API key to complete the technical assessment portion of the application. You can sign up for a free API key at https://www.pexels.com/api/  

To begin, clone this repository to your local machine.

## Development

This is a [NextJS](https://nextjs.org) app, with a SQLite based backend, intended to be run with the LTS version of Node.

To run the development server:

```bash
npm i
npm run dev
```

## Task:

Modify the code to add support for due dates, image previews, and task dependencies.

### Part 1: Due Dates 

When a new task is created, users should be able to set a due date.

When showing the task list is shown, it must display the due date, and if the date is past the current time, the due date should be in red.

### Part 2: Image Generation 

When a todo is created, search for and display a relevant image to visualize the task to be done. 

To do this, make a request to the [Pexels API](https://www.pexels.com/api/) using the task description as a search query. Display the returned image to the user within the appropriate todo item. While the image is being loaded, indicate a loading state.

You will need to sign up for a free Pexels API key to make the fetch request. 

### Part 3: Task Dependencies

Implement a task dependency system that allows tasks to depend on other tasks. The system must:

1. Allow tasks to have multiple dependencies
2. Prevent circular dependencies
3. Show the critical path
4. Calculate the earliest possible start date for each task based on its dependencies
5. Visualize the dependency graph

## Submission:

1. Add a new "Solution" section to this README with a description and screenshot or recording of your solution. 
2. Push your changes to a public GitHub repository.
3. Submit a link to your repository in the application form.

Thanks for your time and effort. We'll be in touch soon!

## Solution:

---

### 1. Due Dates

* Added optional due dates (with optional time) when creating or editing tasks
* Due dates are displayed directly under each task
* Overdue tasks are automatically highlighted in **red**, while upcoming dates appear in neutral gray
* Overdue detection correctly accounts for both date **and** time

---

### 2. Image Generation

* Integrated the **Pexels API** to automatically fetch a relevant image based on the task description
* Images are stored per task and displayed inline in the task card
* A skeleton loading state is shown while images load, with a smooth fade-in transition
* Graceful fallback if no image is found or the API request fails

---

### 3. Task Dependencies & Critical Path

* Implemented a full dependency system allowing:

  * Multiple dependencies per task
  * Four dependency types:

    * Finish-to-Start (FS)
    * Start-to-Start (SS)
    * Finish-to-Finish (FF)
    * Start-to-Finish (SF)
  
* Circular dependencies are prevented using DFS-based cycle detection
* Added **Critical Path Method (CPM)** computation:

  * Calculates earliest start dates based on dependency chains
  * Identifies tasks on the critical path using slack analysis
  * Critical tasks are visually highlighted
* Included a toggleable **dependency graph view** to visualize task relationships and critical paths

---

### 4. Task Editing & UX Improvements

* Added a full **edit task** flow (title, due date, time, duration) without breaking dependencies or images
* Dependency labels were restyled for improved readability and contrast
* Clear action buttons per task:

  * Edit
  * Manage dependencies
  * Delete
* All updates automatically recalculate the critical path to keep scheduling accurate

---

### Tech Notes

* **Backend:** Next.js API routes, Prisma, SQLite
* **Frontend:** Next.js (App Router), React, Tailwind CSS
* **Data integrity** enforced at both API and UI levels
* **Minimal design changes** to stay consistent with the original UI

---

### Screenshots / Demo

*Add screenshots or a short screen recording here showing:*

* Task creation with due dates and images
* Dependency setup
* Critical path highlighting
* Dependency graph view

---

If you want, I can also:

* Compress this into a **shorter recruiter skim version**
* Add a **TL;DR section at the top**
* Help you choose **what screenshots to include** so it looks polished

You’re in great shape for submission — this reads clean and professional.
