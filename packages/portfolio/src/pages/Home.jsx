import Intro from "../components/Intro";
import Projects from "../components/Projects";
import Awards from "../components/Awards";
import Connect from "../components/Connect";
import Footer from "../components/Footer";

const Home = () => (
  <>
    <main className="mx-auto w-full max-w-2xl px-5 sm:px-6">
      <Intro />
      <Projects />
      <Awards />
      <Connect />
    </main>
    <Footer />
  </>
);

export default Home;
