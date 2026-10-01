import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { discoveryProgress } from "../../domain/project/adaptiveQuestions";
import { organicFixture } from "../../fixtures/brandFixtures";
import { useProjects } from "../../state/ProjectContext";

export function ProjectList() {
  const { projects, create } = useProjects();
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("");

  function openNew(event: FormEvent) {
    event.preventDefault();
    const project = create({ clientName, businessName, website, category });
    navigate(`/studio/${project.id}`);
  }

  function openExample() {
    const discovery = organicFixture();
    discovery.progress = { ...discovery.progress, section: "complete", furthest: "complete" };
    const project = create({
      clientName: "North Workshop",
      businessName: "North Workshop",
      website: "",
      category: "Furniture",
      discovery,
    });
    navigate(`/studio/${project.id}`);
  }

  return (
    <div className="studio">
      <header className="studio-top">
        <div>
          <p className="studio-kicker">Brief</p>
          <h1>Clients</h1>
        </div>
        <Link to="/demo/start">Preview discovery</Link>
      </header>
      <div className="studio-split">
        <form className="studio-create" onSubmit={openNew}>
          <p className="studio-kicker">New project</p>
          <h2>Start a client.</h2>
          <label>
            Client
            <input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Who you're working with" />
          </label>
          <label>
            Business
            <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="The name customers use" />
          </label>
          <label>
            Website
            <input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="Optional" />
          </label>
          <label>
            Category
            <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="What kind of business" />
          </label>
          <button type="submit" className="studio-button">Create project</button>
          <button type="button" className="studio-text-button" onClick={openExample}>
            Open the worked example
          </button>
        </form>
        <ul className="studio-project-list">
          {projects.length === 0 ? <li className="studio-empty">No clients yet. A project holds the discovery, the reading, and the files you'll give to other tools.</li> : null}
          {projects.map((project) => (
            <li key={project.id}>
              <Link to={`/studio/${project.id}`}>
                <strong>{project.businessName || "Untitled project"}</strong>
                <span>{project.clientName || "Client not named"}</span>
                <em>Discovery {discoveryProgress(project.discovery)}% · {project.status}</em>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
