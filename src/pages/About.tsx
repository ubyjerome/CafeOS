export const About = () => {
  return (
    <div className="fade-in max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">About</h1>
        <p className="text-sm text-muted-foreground">
          Application information, versioning, and legal details
        </p>
      </div>

      {/* Application Info */}
      <section className="mb-6 space-y-1">
        <h2 className="text-lg font-medium">Application</h2>
        <p className="text-sm">
          <span className="opacity-70">Name:</span> CafeOS
        </p>
        <p className="text-sm">
          <span className="opacity-70">Version:</span> 0.1.0
        </p>
        <p className="text-sm">
          <span className="opacity-70">Build:</span> Beta
        </p>
      </section>

      {/* Developer Info */}
      <section className="mb-6 space-y-1">
        <h2 className="text-lg font-medium">Development</h2>
        {/* <p className="text-sm">
          <span className="opacity-70">Developed by:</span> Ubongabasi Jerome
        </p> */}
        <p className="text-sm">
          <span className="opacity-70">Maintained by:</span> Innovations Labs
        </p>
        <p className="text-sm opacity-70">
          Designed and built for cyber café management and operations.
        </p>
      </section>

      {/* Licensing */}
      <section className="mb-6 space-y-1">
        <h2 className="text-lg font-medium">Licensing</h2>
        <p className="text-sm opacity-70">
          This software includes open-source components licensed under their
          respective licenses.
        </p>
        <p className="text-sm">
          <span className="opacity-70">Primary License:</span> MIT License
        </p>
      </section>

      {/* Credits */}
      <section className="mb-6 space-y-1">
        <h2 className="text-lg font-medium">Credits</h2>
        <p className="text-sm">
          <a
            href="https://icons8.com"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-70 hover:opacity-100 underline underline-offset-2"
          >
            Icons by Icons8
          </a>
        </p>
      </section>

      {/* Technologies */}
      {/* <section className="mb-6 space-y-1">
        <h2 className="text-lg font-medium">Technologies</h2>
        <p className="text-sm opacity-70">
          Built using modern web technologies including React, TypeScript, and
          real-time database services.
        </p>
      </section> */}

      {/* Footer */}
      <div className="mt-10">
        <p className="text-xs opacity-60">
          © {new Date().getFullYear()} CafeOS. All rights reserved.
        </p>
      </div>
    </div>
  );
};
