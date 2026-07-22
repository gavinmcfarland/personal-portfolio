import Intro from "../components/Intro";
import Projects from "../components/Projects";
import PastExperience from "../components/PastExperience";
import Awards from "../components/Awards";
import Connect from "../components/Connect";
import Footer from "../components/Footer";

const Home = () => (
  <>
    <main className="mr-auto w-full max-w-5xl pl-8 pr-5 sm:pl-14 sm:pr-6 lg:pl-24">
      <Intro />
      <Projects />
      <PastExperience />
      <Awards />
      <Connect />
    </main>
    <Footer />
  </>
);

export default Home;
